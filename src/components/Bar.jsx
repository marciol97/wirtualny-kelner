import React, { useState, useEffect } from "react";
import './Kitchen.css';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import TimeElapsed from "./TimeElapsed.jsx";

export default function Bar() {
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ordersData = snapshot.docs.map(doc => ({
                id: doc.id, ...doc.data()
            }));

            const activeOrders = ordersData.filter(order =>
                order.drinksCompleted !== true
            );

            setOrders(activeOrders);
        });
        return () => unsubscribe();
    }, []);

    const finishDrinks = async (orderId) => {
        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, { drinksCompleted: true });
        } catch (error) {
            console.error("Błąd aktualizacji statusu napojów:", error);
            alert("Nie udało się zaktualizować statusu.");
        }
    };

    const barOrders = orders.filter(order => {
        return order.items.some(item => item.category === 'Napoje');
    });

    return (
        <div className="kitchen-container">
            <h2 className="kitchen-header">Panel Barowy</h2>

            <div className="orders-grid">
                {barOrders.length === 0 && (
                    <p style={{textAlign: 'center', gridColumn: '1 / -1', color: '#6b7280'}}>
                        Brak napojów do wydania
                    </p>
                )}

                {barOrders.map(order => {
                    const drinkItems = order.items.filter(item => item.category === 'Napoje');

                    if (drinkItems.length === 0) return null;

                    return (
                        <div key={order.id} className="ticket pending">
                            <div className="ticket-header">
                                <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
                                    <span className="table-number">Stolik {order.tableNumber}</span>
                                    <TimeElapsed createdAt={order.createdAt}/>
                                </div>
                                <span style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', lineHeight: '1' }}>
                                        #{order.dailyOrderNumber || '?'}
                                </span>
                                <span className="status-badge pending">
                                    Napoje
                                </span>
                            </div>

                            <div className="ticket-body">
                                {drinkItems.map((item, index) => (
                                    <div key={index} className="ticket-item">
                                        <span className="item-qty">{item.quantity}x</span>
                                        <span>{item.name}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="ticket-actions">
                                <button
                                    className="btn-status btn-start"
                                    onClick={() => finishDrinks(order.id)}
                                >
                                    Napoje wydane
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}