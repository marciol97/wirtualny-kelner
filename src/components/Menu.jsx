import React, {useEffect, useState} from 'react';
import './Menu.css';
import {collection, onSnapshot} from "firebase/firestore";
import {db} from "../firebase.js";

export default function Menu({ onAdd }) {

    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'menu'), (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id, ...doc.data()
            }));
            setProducts(items);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="menu-container">
            <h2 className="menu-title">Nasze Menu</h2>

            {isLoading ? (
                <p>Wczytywanie pyszności...</p>
            ) : products.length === 0 ? (
                <p style={{color: '#6b7280'}}>Menu jest jeszcze puste. Oczekuj na zmiany</p>
            ) : (
                <div className="menu-grid">
                    {products.map((product) => (
                        <div key={product.id} className="product-card">
                            {product.imageUrl && product.imageUrl.trim() !== "" && (
                                <div className="product-image-container">
                                    <img src={product.imageUrl} alt={product.name} className="product-image" />
                                </div>
                            )}
                            <div className="product-header" style={{marginTop: product.imageUrl ? '1rem' : '0'}}>
                                <h3 className="product-name">{product.name}</h3>
                                <span className="product-price">{product.price.toFixed(2)} zł</span>
                            </div>

                            <p className="product-description">{product.description}</p>

                            <button onClick={() => onAdd(product)} className="btn-add">
                                Dodaj do zamówienia
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}