import React from 'react';
import './Menu.css';

const mockProducts = [
    {id: 1, name: 'Burger Klasyczny', price: 39.90, description: 'Wołowina 250g, ser, pomidor, sałata, sos BBQ'},
    {id: 2, name: 'Pizza Margherita', price: 29.00, description: 'Włoskie ciasto, sos pomidorowy, ser mozarella'},
    {id: 3, name: 'Fytki z batatów', price: 18.90, description: 'Frytki ze słodkiego ziemniaka'},
];

export default function Menu({ onAdd }) {
    return (
        <div className="menu-container">
            <h2 className="menu-title">Nasze Menu</h2>

            <div className="menu-grid">
                {mockProducts.map((product) => (
                    <div key={product.id} className="product-card">
                        <div className="product-header">
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
        </div>
    );
}