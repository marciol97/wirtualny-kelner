import Menu from './components/Menu.jsx';
import Kitchen from "./components/Kitchen.jsx";
import Manager from "./components/Manager.jsx";
import { useState} from "react";
import './App.css';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

function App() {

    const [currentView, setCurrentView] = useState('client');

    const [cart, setCart] = useState([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);

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

        setIsSubmitting(true); // włącza blokade przycisku

        try {
            const orderData = {
                tableNumber: 5,
                status: 'pending',
                totalAmount: totalAmount,
                createdAt: serverTimestamp(),
                items: cart.map(item => ({
                    productId: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                }))
            };

            await addDoc(collection(db, 'orders'), orderData);

            setCart([]);
            setOrderSuccess(true);

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
                <button className={`nav-btn ${currentView === 'manager' ? 'active' : ''}`}
                        onClick={() => setCurrentView('manager')}>
                    Menadżer
                </button>
            </nav>

            {currentView === 'client' ? (
                <>
                    <header className="header">
                        <h1>Wirtualny Kelner</h1>
                    </header>

                    <main className="main-layout">
                        <section className="menu-section">
                            <Menu onAdd={addToCart} />
                        </section>

                        <section className="cart-section">
                            <div className="cart-container">
                                <h2 className="cart-title">Twój Koszyk</h2>

                                {orderSuccess && (
                                    <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
                                        Zamówienie zostało wysłane na kuchnię! 🧑‍🍳
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
                                                    <span className="unit-price">{item.price.toFixed(2)} zł / szt.</span>

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
                                    <span style={{fontSize: '1.125rem', fontWeight: 'bold'}}>Suma:</span>
                                    <span className="summary-total">{totalAmount.toFixed(2)} zł</span>
                                </div>

                                <button
                                    disabled={cart.length === 0 || isSubmitting}
                                    onClick={placeOrder}
                                    className="btn-order"
                                    style={{ opacity: isSubmitting ? 0.7 : 1 }}
                                >
                                    {isSubmitting ? 'Przetwarzanie...' : 'Zamów i zapłać'}
                                </button>
                            </div>
                        </section>
                    </main>
                </>
            ) :  currentView === 'kitchen' ? (
                <Kitchen />
            ) : (
                <Manager />
            )}

        </div>
    )
}
export default App;