import React, {useState, useEffect} from "react";
import './Manager.css';
import {collection, addDoc, deleteDoc, doc, onSnapshot} from "firebase/firestore";
import {ref, uploadBytes, getDownloadURL} from "firebase/storage";
import {db, storage} from "../firebase.js";

export default function Manager() {
    const [menuItems, setMenuItems] = useState([]);

    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // pobieranie menu z bazy
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'menu'), (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id, ...doc.data()
            }));
            setMenuItems(items);
        });
        return () => unsubscribe();
    }, []);

    //dodanie nowego dania
    const handleAddProduct = async (e) => {
        e.preventDefault();
        if (!name || !price) return;

        const parsedPrice = parseFloat(price);
        if (parsedPrice < 0) {
            alert("Cena nie może być mniejsza niz 0 zł!");
            return;
        }

        setIsSubmitting(true);
        try {
            let finalImageUrl = "";

            if (imageFile) {
                const uniqueFileName = `${Date.now()}-${imageFile.name}`;
                const storageRef = ref(storage, `menu-images/${uniqueFileName}`);

                await uploadBytes(storageRef, imageFile);

                finalImageUrl = await getDownloadURL(storageRef);
            }
            await addDoc(collection(db, 'menu'), {
                name: name,
                price: parsedPrice,
                description: description,
                imageUrl: finalImageUrl,
                available: true
            });
            setName('');
            setPrice('');
            setDescription('');
            setImageFile(null);

            document.getElementById('file-upload').value = '';
        } catch (error) {
            console.error("Błąd dodawania:", error);
            alert("Nie udało się dodać produktu.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // usuwanie dania
    const handleDelete = async (id) => {
        if (window.confirm("Czy na pewno chcesz usunąć tę pozycje z menu?")) {
            try {
                await deleteDoc(doc(db, 'menu', id));
            } catch (error) {
                console.error("Błąd usuwania:", error);
            }
        }
    };

    return (
        <div className="manager-container">
            <h2 className="manager-header">Panel Menadżera</h2>

            <div className="manager-layout">
                {/* Lewa kolumna dodawania */}
                <div className="manager-form-section">
                    <form className="manager-form" onSubmit={handleAddProduct}>
                        <h3>Dodaj nowe danie</h3>

                        <div className="form-group">
                            <label className="form-label">Nazwa dania</label>
                            <input
                                type="text"
                                className="form-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Cena (zł)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="form-input"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Opis dania</label>
                            <textarea
                                className="form-textarea"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Wgraj zdjęcie (opcjonalnie)</label>
                            <input
                                id="file-upload"
                                type="file"
                                accept="image/*"
                                className="form-input"
                                onChange={(e) => setImageFile(e.target.files[0])}
                            />
                        </div>

                        <button type="submit" className="btn-submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Dodawanie...' : 'Dodaj do Menu'}
                        </button>
                    </form>
                </div>

                {/* Prawa kolumna, lista pozycji */}
                <div className="manager-list-section">
                    <h3>Obecne menu ({menuItems.length} pozycji)</h3>
                    <div className="manager-list">
                        {menuItems.map(item => (
                            <div key={item.id} className="manager-item">
                                <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                                    {item.imageUrl && item.imageUrl.trim() !== "" && (
                                        <img src={item.imageUrl} alt="" style={{widt: '50px', height: '50px', borderRadius: '4px', objectFit: 'cover'}} />
                                    )}
                                    <div className="manager-item-info">
                                        <h4>{item.name}</h4>
                                        <p>{item.description}</p>
                                        <strong style={{color: '#2563eb'}}>{item.price.toFixed(2)} zł</strong>
                                    </div>
                                </div>
                                <button
                                    className="btn-delete"
                                    onClick={() => handleDelete(item.id)}>
                                    Usuń
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}