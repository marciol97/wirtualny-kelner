import React, { useState, useEffect } from "react";
import './Waiter.css';
import { collection, query, onSnapshot, doc, updateDoc, getDocs, where } from "firebase/firestore";
import { db } from "../firebase.js";

export default function Waiter() {
    const [bills, setBills] = useState([]);
    const [orders, setOrders] = useState([]);
    const [selectedBillId, setSelectedBillId] = useState(null);
    const [itemsToRemove, setItemsToRemove] = useState([]);
    const [pinModal, setPinModal] = useState({ isOpen: false, pin: '' });
    const [managerPinDb, setManagerPinDb] = useState('1111');

    useEffect(() => {
        const qBills = query(collection(db, 'bills'));
        const unsubscribeBills = onSnapshot(qBills, (snapshot) => {
            const billsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBills(billsData.filter(b => b.status !== 'archived'));
        });

        const qOrders = query(collection(db, 'orders'));
        const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
            const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(ordersData);
        });

        const unsubscribePin = onSnapshot(doc(db, 'settings', 'security'), (docSnap) => {
            if (docSnap.exists() && docSnap.data().managerPin) {
                setManagerPinDb(docSnap.data().managerPin);
            }
        });

        return () => {
            unsubscribeBills();
            unsubscribeOrders();
            unsubscribePin();
        };
    }, []);

    const sortedBills = [...bills].sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeA - timeB;
    });

    const tableCounters = {};

    const activeBillsWithTotals = sortedBills.map(bill => {
        const billOrders = orders.filter(o => o.billId === bill.id);
        const allItems = billOrders.flatMap(o => o.items || []);
        const groupedItems = allItems.reduce((acc, item) => {
            const existing = acc.find(i => i.productId === item.productId);
            if (existing) {
                existing.quantity += item.quantity;
            } else {
                acc.push({ ...item });
            }
            return acc;
        }, []);

        const totalSum = groupedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const tableNum = bill.tableNumber;
        if (!tableCounters[tableNum]) {
            tableCounters[tableNum] = 1;
        } else {
            tableCounters[tableNum]++;
        }
        const subIndex = tableCounters[tableNum];

        return {
            ...bill,
            subIndex,
            items: groupedItems,
            totalSum: totalSum
        };
    });

    const currentBill = activeBillsWithTotals.find(b => b.id === selectedBillId);

    const handleUpdateBillStatus = async (billId, newStatus) => {
        try {
            await updateDoc(doc(db, 'bills', billId), { status: newStatus });
            if (newStatus === 'archived') {
                closeModal();
            }
        } catch (error) {
            console.error("Błąd aktualizacji rachunku:", error);
        }
    };

    const handlePrintAndArchive = async (billId) => {
        console.log(`Wysyłanie danych rachunku ${billId} na drukarkę fiskalną...`);
        await handleUpdateBillStatus(billId, 'archived');
    };

    const closeModal = () => {
        setSelectedBillId(null);
        setItemsToRemove([]);
    };

    // usuwanie koszyka
    const handleStageRemoval = (item) => {
        setItemsToRemove(prev => {
            const existingStaged = prev.find(i => i.productId === item.productId);
            const totalStaged = existingStaged ? existingStaged.quantity : 0;

            if (totalStaged >= item.quantity) {
                alert("Nie możesz usunąć więcej sztuk, niż znajduje się na rachunku!");
                return prev;
            }

            if (existingStaged) {
                return prev.map(i => i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const handleUnstageRemoval = (productId) => {
        setItemsToRemove(prev => {
            const existing = prev.find(i => i.productId === productId);
            if (existing && existing.quantity > 1) {
                return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i);
            }
            return prev.filter(i => i.productId !== productId);
        });
    };

    const confirmRemoval = async (e) => {
        e.preventDefault();

        if (pinModal.pin !== managerPinDb) {
            alert("Błędny kod PIN menadżera!");
            return;
        }

        try {
            const q = query(collection(db, 'orders'), where('billId', '==', selectedBillId));
            const snapshot = await getDocs(q);
            const ordersToUpdate = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            for (let stagedItem of itemsToRemove) {
                let quantityToRemove = stagedItem.quantity;

                for (let order of ordersToUpdate) {
                    if (quantityToRemove <= 0) break;

                    const itemIndex = order.items.findIndex(i => i.productId === stagedItem.productId && i.quantity > 0);
                    if (itemIndex !== -1) {
                        const availableInThisOrder = order.items[itemIndex].quantity;
                        const removingHere = Math.min(availableInThisOrder, quantityToRemove);

                        order.items[itemIndex].quantity -= removingHere;
                        quantityToRemove -= removingHere;

                        if (order.items[itemIndex].quantity === 0) {
                            order.items.splice(itemIndex, 1);
                        }
                    }
                }
            }

            for (let order of ordersToUpdate) {
                await updateDoc(doc(db, 'orders', order.id), {
                    items: order.items
                });
            }

            setPinModal({ isOpen: false, pin: '' });
            setItemsToRemove([]);

        } catch (error) {
            console.error("Błąd podczas usuwania:", error);
            alert("Wystąpił błąd systemu.");
        }
    };

    return (
        <div className="waiter-container">
            <h2 className="waiter-header no-print">Panel Kelnerski</h2>

            <div className="bills-grid no-print">
                {activeBillsWithTotals.length === 0 && (
                    <p style={{ textAlign: 'center', gridColumn: '1 / -1', color: '#6b7280' }}>
                        Brak otwartych rachunków na sali.
                    </p>
                )}

                {activeBillsWithTotals.map(bill => (
                    <div key={bill.id} className={`bill-card ${bill.status}`}>
                        <div className="bill-card-header">
                            <span className="table-number">Stolik {bill.tableNumber}</span>
                            {bill.subIndex > 1 && (
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#6b7280' }}>
                                    #{bill.subIndex}
                                </span>
                            )}
                        </div>

                        <div className="bill-card-body">
                            <div className="bill-status-text">
                                {bill.status === 'open' && 'W trakcie zamówienia'}
                                {bill.status === 'cash_requested' && 'Prosi o rachunek (Gotówka)'}
                                {bill.status === 'paid_online' && 'Opłacono online!'}
                            </div>
                            <div className="bill-total">
                                {bill.totalSum.toFixed(2)} zł
                            </div>
                        </div>

                        <div className="bill-card-actions">
                            <button
                                className="btn-open-bill"
                                onClick={() => setSelectedBillId(bill.id)}
                            >
                                Otwórz rachunek
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {currentBill && (
                <div className="modal-overlay no-print" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>

                        <div className="print-section">
                            <div className="modal-header">
                                <h3>
                                    Stolik {currentBill.tableNumber}
                                    {currentBill.subIndex > 1 ? ` (#${currentBill.subIndex})` : ''}
                                </h3>
                            </div>

                            <ul className="modal-item-list">
                                {currentBill.items.map((item, idx) => {
                                    const stagedCount = itemsToRemove.find(i => i.productId === item.productId)?.quantity || 0;

                                    return (
                                        <li key={idx} className="modal-item">
                                            <div style={{display: 'flex', alignItems: 'center'}}>
                                                {currentBill.status !== 'paid_online' && (
                                                    <button
                                                        className="btn-remove-item no-print"
                                                        onClick={() => handleStageRemoval(item)}
                                                        title="Dodaj do usunięcia"
                                                    >
                                                        ➖
                                                    </button>
                                                )}
                                                <div className="modal-item-name">
                                                    <strong>{item.quantity}x</strong> {item.name}
                                                    {stagedCount > 0 && (
                                                        <span style={{color: '#ef4444', fontSize: '0.85rem', marginLeft: '0.5rem', fontWeight: 'bold'}}>
                                                            (do usunięcia: {stagedCount})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="modal-item-price">
                                                {(item.price * item.quantity).toFixed(2)} zł
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>

                            <div className="modal-summary">
                                <span>Suma całkowita:</span>
                                <strong>{currentBill.totalSum.toFixed(2)} zł</strong>
                            </div>
                        </div>

                        {itemsToRemove.length > 0 && (
                            <div className="removal-staging-area no-print">
                                <h4 style={{ color: '#ef4444', borderBottom: '1px solid #fee2e2', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                                    Pozycje do usunięcia:
                                </h4>
                                <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1rem' }}>
                                    {itemsToRemove.map((staged, idx) => (
                                        <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                                            <span><strong>{staged.quantity}x</strong> {staged.name}</span>
                                            <button
                                                onClick={() => handleUnstageRemoval(staged.productId)}
                                                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem' }}
                                            >
                                                ×
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    className="btn-action-primary cash"
                                    style={{ width: '100%', backgroundColor: '#ef4444' }}
                                    onClick={() => setPinModal({ isOpen: true, pin: '' })}
                                >
                                    Potwierdź usunięcie (Wymaga autoryzacji)
                                </button>
                            </div>
                        )}

                        <div className="modal-actions no-print">
                            {currentBill.status === 'paid_online' && (
                                <button
                                    className="btn-action-primary online"
                                    onClick={() => handleUpdateBillStatus(currentBill.id, 'archived')}
                                >
                                    Zwolnij stolik (Archiwizuj)
                                </button>
                            )}

                            {currentBill.status === 'cash_requested' && (
                                <button
                                    className="btn-action-primary cash"
                                    onClick={() => handlePrintAndArchive(currentBill.id)}
                                >
                                    Wydrukuj paragon i zamknij
                                </button>
                            )}

                            <button className="btn-close-modal" onClick={closeModal}>
                                Zamknij podgląd
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pin menadzera */}
            {pinModal.isOpen && (
                <div className="modal-overlay no-print" style={{ zIndex: 100 }}>
                    <div className="pin-modal-content">
                        <h3>Wymagana autoryzacja</h3>
                        <p style={{marginBottom: '1rem', color: '#4b5563'}}>
                            Wpisz kod PIN menadżera, aby trwale usunąć zaznaczone pozycje z rachunku.
                        </p>

                        <form onSubmit={confirmRemoval}>
                            <input
                                type="password"
                                className="pin-input"
                                placeholder="PIN"
                                autoFocus
                                value={pinModal.pin}
                                onChange={(e) => setPinModal({...pinModal, pin: e.target.value})}
                            />
                            <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem'}}>
                                <button type="button" className="btn-secondary" style={{flex: 1}} onClick={() => setPinModal({isOpen: false, pin: ''})}>
                                    Anuluj
                                </button>
                                <button type="submit" className="btn-action-primary cash" style={{flex: 1, backgroundColor: '#ef4444'}}>
                                    Usuń pozycje
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}