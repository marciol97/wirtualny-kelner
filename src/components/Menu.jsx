import React from 'react';

const mockProducts = [
    {id: 1, name: 'Burger Klasyczny', price: 39.90, description: 'Wołowina 250g, ser, pomidor, sałata, sos BBQ'},
    {id: 2, name: 'Pizza Margherita', price: 29.00, description: 'Włoskie ciasto, sos pomidorowy, ser mozarella'},
    {id: 3, name: 'Fytki z batatów', price: 18.90, description: 'Frytki ze słodkiego ziemniaka'},
];

export default function Menu({ onAdd }) {
    return (
        <div className="max-w-4xl mx-auto p-4">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Nasze Menu</h2>

            <div className="grid gap-4 md:grid-cols-2">

                {mockProducts.map((product) => (

                    <div key={product.id} className="border rounded-lg p-4 shadow-sm bg-white hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-semibold">{product.name}</h3>
                            <span className="text-lg font-bold text-blue-600">{product.price.toFixed(2)} zł</span>
                        </div>

                        <p className="text-gray-600 text-sm mb-4">{product.description}</p>

                        <button
                            onClick={() => onAdd(product)}
                            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors font-medium">
                            Dodaj do zamówienia
                        </button>
                    </div>

                ))}

            </div>
        </div>
    );
}