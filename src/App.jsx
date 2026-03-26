import Menu from './components/Menu';
import { useState} from "react";

function App() {
    const [cart, setCart] = useState([]);
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
    return (
        <div className="min-h-screen bg-gray-50">

            <header className="bg-white shadow-sm p-4 mb-4">
                <h1 className="text-2xl font-bold text-center text-blue-600">
                    Wirtualny Kelner 🍽️
                </h1>
            </header>


            <main className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full gap-4 px-4 pb-8">

                <div className="md:w-2/3">    {/* lewa kolumna menu na 2/3 szerokości */}
                    <Menu onAdd={addToCart} />
                </div>

                <div className="md:w-1/3 bg-white p-6 rounded-lg shadow-sm border h-fit sticky top-4">
                    {/* prawa kolumna koszyka na 1/3 szerokosci  */}
                    <h2 className="text-xl font-bold mb-4 border-b pb-2">Twój Koszyk</h2>

                    {/* Jeśli pusto pokaż napis. Jeśli nie pokaż listę. */}
                    {cart.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Koszyk jest pusty</p>
                    ) : (
                        <ul className="mb-4 space-y-4">
                            {cart.map((item) => (
                                <li key={item.id} className="flex flex-col border-b pb-2 last:border-0">
                                    <div className="flex justify-between font-medium text-gray-800">
                                        <span>{item.name}</span>
                                        <span className="whitespace-nowrap">{(item.price * item.quantity).toFixed(2)} zł</span>
                                    </div>

                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-sm text-gray-500 whitespace-nowrap">{item.price.toFixed(2)} zł / szt.</span>

                                        <div className="flex items-center gap-3 bg-gray-100 rounded-md p-1">
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm text-red-500 font-bold hover:bg-red-50 transition-colors"
                                            >
                                                -
                                            </button>
                                            <span className="w-4 text-center font-semibold">{item.quantity}</span>
                                            <button
                                                onClick={() => addToCart(item)}
                                                className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm text-green-500 font-bold hover:bg-green-50 transition-colors"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t border-gray-200 mt-4">
                        <span className="text-lg font-bold">Suma:</span>
                        <span className="text-2xl font-bold text-blue-600">{totalAmount.toFixed(2)} zł</span>
                    </div>

                    <button
                        // Jeśli koszyk jest pusty, blokujemy możliwość kliknięcia
                        disabled={cart.length === 0}
                        className="w-full mt-6 bg-green-500 text-white py-3 rounded-lg font-bold hover:bg-green-600 disabled:bg-gray-300 transition-colors"
                    >
                        Zamów i zapłać
                    </button>
                </div>

            </main>

        </div>
    )
}

export default App;