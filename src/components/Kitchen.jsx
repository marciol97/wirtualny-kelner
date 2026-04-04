import React, {useState, useEffect} from "react";
import './Kitchen.css';
import {collection, query, orderBy, onSnapshot, doc, updateDoc} from "firebase/firestore";
import {db} from "../firebase.js";
import TimeElapsed from "./TimeElapsed.jsx";

export default function Kitchen() {
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ordersData = snapshot.docs.map(doc => ({
                id: doc.id, ...doc.data()
            }));
            const activeOrders = ordersData.filter(order => order.status !== 'completed');
            setOrders(activeOrders);
        });
        return () => unsubscribe();
    }, []);

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {status: newStatus});
        } catch (error) {
            console.error("Błąd aktualizacji statusu:", error);
            alert("Nie udało się zaktualizować statusu.");
        }
    };

    return (
        <div className="kitchen-container">
            <h2 className="kitchen-header">Panel Kuchenny</h2>

            <div className="orders-grid">
                {orders.length === 0 && (
                    <p style={{textAlign: 'center', gridColumn: '1 / -1', color: '#6b7280'}}>
                        Brak zamówień do realizacji
                    </p>
                )}

                {orders.map(order => {
                    const kitchenItems = order.items.filter(item => item.category !== 'Napoje');

                    if (kitchenItems.length === 0) return null;

                    return (
                        <div key={order.id} className={`ticket ${order.status}`}>
                            <div className="ticket-header">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
                                    <span className="table-number">Stolik {order.tableNumber}</span>
                                    <TimeElapsed createdAt={order.createdAt}></TimeElapsed>
                                </div>
                                <span className={`status-badge ${order.status}`}>
                                    {order.status === 'pending' ? 'Nowe' : 'W trakcie'}
                                </span>
                            </div>

                            <div className="ticket-body">
                                {kitchenItems.map((item, index) => (
                                    <div key={index} className="ticket-item">
                                        <span className="item-qty">{item.quantity}x</span>
                                        <span>{item.name}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="ticket-actions">
                                {order.status === 'pending' && (
                                    <button className="btn-status btn-start"
                                            onClick={() => updateOrderStatus(order.id, 'in_progress')}>
                                        Zacznij przygotowywać
                                    </button>
                                )}
                                {order.status === 'in_progress' && (
                                    <button className="btn-status btn-finish"
                                            onClick={() => updateOrderStatus(order.id, 'completed')}>
                                        Wydaj danie
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
