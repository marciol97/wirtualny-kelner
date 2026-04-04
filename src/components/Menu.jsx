import React, {useEffect, useState, useMemo} from 'react';
import './Menu.css';
import {collection, onSnapshot} from "firebase/firestore";
import {db} from "../firebase.js";
import {LayoutGrid, Salad, UtensilsCrossed, CupSoda, CakeSlice} from "lucide-react"; //ikonki do menu

export default function Menu({ onAdd }) {

    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('Wszystkie');

    const categories =[
        {name: 'Wszystkie', icon: LayoutGrid },
        {name: 'Przystawki', icon: Salad },
        {name: 'Dania Główne', icon: UtensilsCrossed},
        {name: 'Napoje', icon: CupSoda},
        {name: 'Desery', icon: CakeSlice}
    ];

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

    const sortedProducts = useMemo(() => {

        const categoryOrder = {
            'Przystawki': 1,
            'Dania Główne': 2,
            'Napoje': 3,
            'Desery': 4
        };

        const availableProducts = products.filter(p => p.available !== false);

        const filteredProducts = activeCategory === 'Wszystkie' ? availableProducts : availableProducts.filter(p => (p.category || 'Dania Główne') === activeCategory);

        //logika sortowania produktów
        return [...filteredProducts].sort((a, b) => {
            const weightA = categoryOrder[a.category || 'Dania Główne'] || 99;
            const weightB = categoryOrder[b.category || 'Dania Główne'] || 99;

            return weightA - weightB;
        });
    }, [products, activeCategory]);

    const renderProductCard = (product) => (
        <div key={product.id} className="product-card">
            {product.imageUrl && product.imageUrl.trim() !== "" && (
                <div className="product-image-container">
                    <img src={product.imageUrl} alt={product.name} className="product-image" />
                </div>
            )}
            <div className="product-header" style={{marginTop: product.imageUrl ?'1rem' : '0'}}>
                <h3 className="product-name">{product.name}</h3>
                <span className="product-price">{(Number(product.price) || 0).toFixed(2)} zł</span>
            </div>
            <p className="product-description">{product.description}</p>
            <button onClick={() => onAdd(product)} className="btn-add">
                Dodaj do zamówienia
            </button>
        </div>
    )

    return (
        <div className="menu-container">
            <h2 className="menu-title">Nasze Menu</h2>

            <div className="category-filter-bar">
                {categories.map(cat => {
                    const IconComponent = cat.icon;
                    return (
                        <button
                            key={cat.name}
                            className={`category-pill ${activeCategory === cat.name ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat.name)}>
                            <IconComponent size={18} className="category-icon" />
                            <span>{cat.name}</span>
                        </button>
                    );
                })}
            </div>

            {isLoading ? (
                <p>Wczytywanie pyszności...</p>
            ) : products.length === 0 ? (
                <p style={{color: '#6b7280'}}>Menu jest jeszcze puste. Oczekuj na zmiany</p>
            ) : (
                <div className="menu-content">
                    {categories.filter(cat => cat.name !== 'Wszystkie').map(cat => {
                        const isVisible = activeCategory === 'Wszystkie' || activeCategory === cat.name;
                        if (!isVisible) return null;

                        const catProducts = sortedProducts.filter(p => (p.category || 'Dania Główne') === cat.name);

                        if (catProducts.length === 0) {
                            if (activeCategory !== 'Wszystkie') {
                                return (
                                    <p key={`empty-${cat.name}`} style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0' }}>
                                        Brak dań w tej kategorii
                                    </p>
                                );
                            }
                            return null;
                        }

                        const SectionIcon = cat.icon;

                        return (
                            <div key={cat.name} className="menu-category-section">
                                {activeCategory === 'Wszystkie' && (
                                    <h3 className="menu-category-header">
                                        <SectionIcon size={24} className="category-header-icon" />
                                        {cat.name}
                                    </h3>
                                )}
                                <div className="menu-grid">
                                    {catProducts.map(renderProductCard)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}