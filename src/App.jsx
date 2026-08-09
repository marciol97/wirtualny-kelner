import Menu from './components/Menu.jsx';
import Kitchen from "./components/Kitchen.jsx";
import Manager from "./components/Manager.jsx";
import Bar from "./components/Bar.jsx";
import Waiter from "./components/Waiter.jsx";
import { useState, useEffect, useRef} from "react";
import './App.css';
import { collection, serverTimestamp, doc, addDoc, getDocs, query, where, orderBy, limit, updateDoc} from 'firebase/firestore';
import { db } from './firebase';
import { ShoppingBasket } from "lucide-react"

function App() {

    const [currentView, setCurrentView] = useState('client');
    const [cart, setCart] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [activeBillId, setActiveBillId] = useState(localStorage.getItem('activeBillId') || null);
    const [isPaymentView, setIsPaymentView] = useState(false);
    const [billItems, setBillItems] = useState([]);
    const [isBillRequestedView, setIsBillRequestedView] = useState(false);
    const [isOnlinePaymentSuccess, setIsOnlinePaymentSuccess] = useState(false);
    const [tableNumber, setTableNumber] = useState(localStorage.getItem('tableNumber') || null);
    const cartSectionRef = useRef(null);
    const [isCartVisible, setIsCartVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsCartVisible(entry.isIntersecting);
            },
            {threshold: 0.1}
        );

        if (cartSectionRef.current) {
            observer.observe(cartSectionRef.current);
        }

        return () => {
            if (cartSectionRef.current) {
                observer.unobserve(cartSectionRef.current);
            }
        };
    }, [currentView]);

    const activeCartItemsCount = cart.filter(item => !item.ordered).reduce((sum, item) => sum + item.quantity, 0);


    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);

        // czyszczenie sesji po 15 minutach braku aktywności
        const storedTable = localStorage.getItem('tableNumber');
        const lastActiveTime = localStorage.getItem('lastActiveTime');
        const storedBillId = localStorage.getItem('activeBillId');

        if (storedTable && !storedBillId && lastActiveTime) {
            const currentTime = new Date().getTime();
            if (currentTime - parseInt(lastActiveTime) > 900000) {
                localStorage.removeItem('tableNumber');
                localStorage.removeItem('lastActiveTime');
                setTableNumber(null);
            }
        }

        // odczytywanie kodów qr z adresu
        const tableParam = queryParams.get("table");
        if (tableParam) {
            const validateAndSetTable = async () => {
                try {
                    const qrQuery = query(collection(db, 'qr_codes'), where('tableNumber', '==', Number(tableParam)));
                    const qrSnapshot = await getDocs(qrQuery);

                    if (qrSnapshot.empty) {
                        alert(`Błąd: Stolik nr ${tableParam} nie istnieje w systemie!`);
                        window.history.replaceState(null, '', window.location.pathname);
                        return;
                    }

                    setTableNumber(tableParam);
                    localStorage.setItem('tableNumber', tableParam);
                    localStorage.setItem('lastActiveTime', new Date().getTime().toString());
                    window.history.replaceState(null, '', window.location.pathname);
                } catch (error) {
                    console.error("Błąd podczas weryfikacji stolika:", error);
                }
            };

            validateAndSetTable();
        }

        // płatności przez stripe
        if (queryParams.get("success")) {
            const billId = queryParams.get("billId");
            if (billId) {
                const closeBill = async () => {
                    try {
                        const billRef = doc(db, 'bills', billId);
                        await updateDoc(billRef, { status: 'paid_online' });
                        localStorage.removeItem('activeBillId');
                        localStorage.removeItem('tableNumber');
                        localStorage.removeItem('lastActiveTime');
                        setActiveBillId(null);
                        setTableNumber(null);
                        setIsOnlinePaymentSuccess(true);

                        window.history.replaceState(null, '', window.location.pathname);
                    } catch (e) {
                        console.error("Błąd zamykania rachunku po płatności:", e);
                    }
                };
                closeBill();
            }
        }

        if (queryParams.get("canceled")) {
            alert("Płatność została anulowana.");
            window.history.replaceState(null, '', window.location.pathname);
        }
    }, []);

    const addToCart = (product) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find(item => item.id === product.id);

            if (existingItem) {
                return prevCart.map(item => item.id === product.id ? {
                    ...item, quantity: item.quantity + 1
                } : item );
            }
            return [...prevCart, { ...product, quantity: 1}];
        });
    };

    const removeFromCart = (productId) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find(item => item.id === productId);

            if (existingItem.quantity === 1) {
                return prevCart.filter(item => item.id !== productId);
            }
            return prevCart.map(item => item.id === productId ? {
                ...item, quantity: item.quantity - 1
            } : item );
        })
    }

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const placeOrder = async () => {
        if (cart.length === 0) return;

        if (!tableNumber) {
            alert("Nie przypisano stolika! Zeskanuj kod QR z Twojego stolika, aby złożyć zamówienie.");
            return;
        }

        setIsSubmitting(true); // włącza blokade przycisku

        try {
            let currentBillId = activeBillId;

            if (!currentBillId) {

                const newBillRef = await addDoc(collection(db, 'bills'), {
                    tableNumber: Number(tableNumber),
                    status: 'open',
                    createdAt: serverTimestamp()
                });
                currentBillId = newBillRef.id;
                setActiveBillId(currentBillId);
                localStorage.setItem('activeBillId', currentBillId);
            }

            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const q = query(
                collection(db, 'orders'),
                where('createdAt', '>=', startOfDay),
                orderBy('createdAt', 'desc'),
                limit(1)
            );

            let nextTicketNum = 1;
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const lastOrder = querySnapshot.docs[0].data();
                if (lastOrder.dailyOrderNumber) {
                    nextTicketNum = lastOrder.dailyOrderNumber + 1;
                }
            }

            await addDoc(collection(db, 'orders'), {
                tableNumber: Number(tableNumber),
                dailyOrderNumber: nextTicketNum,
                billId: currentBillId,
                status: 'pending',
                drinksCompleted: false,
                createdAt: serverTimestamp(),
                items: cart.map(item => ({
                    productId: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    category: item.category || 'Dania Główne'
                }))
            });

            setCart([]);
            setOrderSuccess(true);
            localStorage.setItem('lastActiveTime', new Date().getTime().toString());

            setTimeout(() => {
                setOrderSuccess(false);
            }, 4000);

        } catch (error) {
            console.error("Błąd podczas wysyłania do Firebase:", error);
            alert("Wystąpił błąd połączenia z serwerem. Spróbuj ponownie.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchBillSummary = async () => {
        if (!activeBillId) return;

        setIsSubmitting(true);
        try {
            const q = query(collection(db, 'orders'), where('billId', '==', activeBillId));
            const querySnapshot = await getDocs(q);

            const allItems = [];
            querySnapshot.forEach(doc => {
                allItems.push(...doc.data().items);
            });

            const aggregated = allItems.reduce((acc, item) => {
                const existing = acc.find(i => i.productId === item.productId);
                if (existing) {
                    existing.quantity += item.quantity;
                } else {
                    acc.push({ ...item });
                }
                return acc;
            }, []);

            setBillItems(aggregated);
            setIsPaymentView(true);
        } catch (error) {
            console.error("Błąd pobierania rachunku:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCashPayment = async () => {
        try {
            const billRef = doc(db, 'bills', activeBillId);
            await updateDoc(billRef, { status: 'cash_requested' });
            localStorage.removeItem('activeBillId');
            localStorage.removeItem('tableNumber');
            localStorage.removeItem('lastActiveTime');
            setActiveBillId(null);
            setTableNumber(null);
            setIsPaymentView(false);
            setIsBillRequestedView(true);
        } catch (e) {
            console.error("Błąd podczas zamykania rachunku:", e);
        }
    };

    const handleOnlinePayment = async () => {
        setIsSubmitting(true);
        try {
            const response = await fetch(import.meta.env.VITE_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: billItems,
                    billId: activeBillId
                }),
            });

            const session = await response.json();
            window.location.href = session.url;
        } catch (e) {
            console.error("Błąd płatności:", e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReturnToMain = () => {
        setIsBillRequestedView(false);
        setIsPaymentView(false);
        setIsOnlinePaymentSuccess(false);
        setCart([]);
        setOrderSuccess(false);
    };

    return (
        <div className="app-container">
            <nav className="top-navigation">
                <button className={`nav-btn ${currentView === 'client' ? 'active' : ''}`}
                        onClick={() => setCurrentView('client')}>
                    Widok Klienta
                </button>
                <button className={`nav-btn ${currentView === 'kitchen' ? 'active' : ''}`}
                        onClick={() => setCurrentView('kitchen')}>
                    Panel kuchni
                </button>
                <button className={`nav-btn ${currentView === 'bar' ? 'active' : ''}`}
                        onClick={() => setCurrentView('bar')}>
                    Panel baru
                </button>
                <button className={`nav-btn ${currentView === 'manager' ? 'active' : ''}`}
                        onClick={() => setCurrentView('manager')}>
                    Menadżer
                </button>
                <button className={`nav-btn ${currentView === 'waiter' ? 'active' : ''}`}
                        onClick={() => setCurrentView('waiter')}>
                    Kelner
                </button>
            </nav>

            {currentView === 'client' ? (
                isOnlinePaymentSuccess ? (
                    <main className="main-layout" style={{justifyContent: 'center', alignItems: 'center', minHeight: '60vh'}}>
                        <section className="checkout-section" style={{width: '100%', maxWidth: '500px', textAlign: 'center'}}>
                            <div className="cart-container" style={{padding: '2rem'}}>
                                <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🎉</div>
                                <h2 style={{marginBottom: '1rem'}}>Płatność zakończona sukcesem!</h2>
                                <p style={{color: '#4b5563', marginBottom: '2rem', lineHeight: '1.5'}}>
                                    Dziękujemy za opłacenie rachunku. Twoja wizyta została zakończona.
                                    Aby złożyć nowe zamówienie, zeskanuj ponownie kod QR ze stolika.
                                </p>
                                <button
                                    className="btn-order"
                                    onClick={handleReturnToMain}
                                    style={{backgroundColor: '#10b981'}}
                                >
                                    Powrót do menu
                                </button>
                            </div>
                        </section>
                    </main>
                ) : isBillRequestedView ? (
                    <main className="main-layout" style={{justifyContent: 'center', alignItems: 'center', minHeight: '60vh'}}>
                        <section className="checkout-section" style={{width: '100%', maxWidth: '500px', textAlign: 'center'}}>
                            <div className="cart-container" style={{padding: '2rem'}}>
                                <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🧾</div>
                                <h2 style={{marginBottom: '1rem'}}>Rachunek w drodze!</h2>
                                <p style={{color: '#4b5563', marginBottom: '2rem', lineHeight: '1.5'}}>
                                    Kelner za chwilę podejdzie do Ciebie z rachunkiem.
                                    Po uregulowaniu płatności, aby zamówić ponownie, zeskanuj kod QR ze stolika.
                                </p>
                                <button
                                    className="btn-order"
                                    onClick={handleReturnToMain}
                                    style={{backgroundColor: '#3b82f6'}}
                                >
                                    Powrót do menu
                                </button>
                            </div>
                        </section>
                    </main>
                ) : isPaymentView ? (
                    /* widok podusmowania rachunku */
                    <main className="main-layout" style={{justifyContent: 'center'}}>
                        <section className="checkout-section" style={{width: '100%', maxWidth: '600px'}}>
                            <div className="cart-container">
                                <h2 className="cart-title">Podsumowanie Twojego rachunku</h2>
                                <ul className="cart-list" style={{ listStyle: 'none', padding: 0 }}>
                                    {billItems.map((item, idx) => (
                                        <li key={idx} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.75rem 0',
                                            borderBottom: '1px solid #f3f4f6'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontWeight: '500' }}>{item.name}</span>
                                                <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>x{item.quantity}</span>
                                            </div>

                                            <span style={{ fontWeight: 'bold', color: '#1f2937' }}>
                                                {(item.price * item.quantity).toFixed(2)} zł
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="cart-summary" style={{marginTop: '1.5rem', fontSize: '1.2rem', borderTop: '2px solid #eee', paddingTop: '1rem'}}>
                                    <strong>Suma całkowita:</strong>
                                    <strong className="summary-total">
                                        {billItems.reduce((sum, i) => sum + (i.price * i.quantity), 0).toFixed(2)} zł
                                    </strong>
                                </div>

                                <div style={{display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.5rem'}}>
                                    <button
                                        className="btn-order"
                                        style={{backgroundColor: '#10b981', margin: 0}}
                                        onClick={handleOnlinePayment}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Przekierowywanie...' : 'Zapłać online (BLIK / Karta)'}
                                    </button>
                                    <button className="btn-order" onClick={handleCashPayment} style={{backgroundColor: '#f59e0b', margin: 0}}>
                                        Zapłać gotówką u kelnera
                                    </button>
                                    <button
                                        className="btn-secondary"
                                        onClick={() => setIsPaymentView(false)}
                                        style={{padding: '0.75rem', border: '1px solid #d1d5db', background: 'white', fontWeight: 'bold', borderRadius: '0.5rem'}}
                                    >
                                        Powrót do zamawiania
                                    </button>
                                </div>
                            </div>
                        </section>
                    </main>
                ) : (
                    <>
                        <header className="header">
                            <h1>Wirtualny Kelner</h1>
                            <p style={{color: '#6b7280', fontSize: '0.9rem', marginTop: '0.5rem'}}>
                                {tableNumber ? `Zeskanowano stolik nr: ${tableNumber}` : 'Brak przypisanego stolika'}
                            </p>

                            {activeBillId && <p style={{color: '#10b981', fontSize: '0.9rem', marginTop: '0.5rem'}}>
                                Rachunek otwarty (Stolik {tableNumber})
                            </p>}
                        </header>

                        <main className="main-layout">
                            <section className="menu-section">
                                <Menu onAdd={addToCart} />
                            </section>

                            <section className="cart-section" ref={cartSectionRef}>
                                <div className="cart-container">
                                    <h2 className="cart-title">Twój Koszyk</h2>

                                    {orderSuccess && (
                                        <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
                                            Zamówienie zostało wysłane!
                                        </div>
                                    )}

                                    {cart.length === 0 ? (
                                        <p className="empty-cart">Koszyk jest pusty</p>
                                    ) : (
                                        <ul className="cart-list" style={{listStyle: 'none'}}>
                                            {cart.map((item) => (
                                                <li key={item.id} className="cart-item">
                                                    <div className="cart-item-info">
                                                        <span>{item.name}</span>
                                                        <span className="price-text">{(item.price * item.quantity).toFixed(2)} zł</span>
                                                    </div>
                                                    <div className="cart-item-controls">
                                                        <div className="quantity-controls">
                                                            <button onClick={() => removeFromCart(item.id)} className="btn-qty minus">-</button>
                                                            <span className="qty-number">{item.quantity}</span>
                                                            <button onClick={() => addToCart(item)} className="btn-qty plus">+</button>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    <div className="cart-summary">
                                        <span style={{fontSize: '1.125rem', fontWeight: 'bold'}}>Suma koszyka:</span>
                                        <span className="summary-total">{totalAmount.toFixed(2)} zł</span>
                                    </div>

                                    <button
                                        disabled={cart.length === 0 || isSubmitting}
                                        onClick={placeOrder}
                                        className="btn-order"
                                        style={{ opacity: isSubmitting ? 0.7 : 1 }}
                                    >
                                        {isSubmitting ? 'Wysyłanie...' : (activeBillId ? 'Zamów i dodaj do rachunku' : 'Zamów')}
                                    </button>

                                    {activeBillId && (
                                        <button
                                            onClick={fetchBillSummary}
                                            className="btn-secondary"
                                            style={{ width: '100%', marginTop: '0.5rem', backgroundColor: '#6366f1', color: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            Przejdź do płatności
                                        </button>
                                    )}
                                </div>
                            </section>
                        </main>

                        <div
                            className={`floating-cart-wrapper ${isCartVisible ? 'hidden' : ''}`}
                            onClick={() => cartSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            <div className="floating-cart-btn">
                                <ShoppingBasket size={24} color="white" />
                                {activeCartItemsCount > 0 && (
                                    <span className="floating-cart-badge">{activeCartItemsCount}</span>
                                )}
                            </div>
                        </div>

                    </>
                )
            ) :  currentView === 'kitchen' ? (
                <Kitchen />
            ) : currentView === 'manager' ?(
                <Manager />
            ) : currentView === 'bar' ?(
                <Bar />
            ) : (
                <Waiter />
            )}

        </div>
    )
}
export default App;