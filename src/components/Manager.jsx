import React, {useState, useEffect} from "react";
import './Manager.css';
import {collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc} from "firebase/firestore";
import {ref, uploadBytes, getDownloadURL} from "firebase/storage";
import {db, storage} from "../firebase.js";

export default function Manager() {
    const [menuItems, setMenuItems] = useState([]);

    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [existingImageUrl, setExistingImageUrl] = useState('');
    const [category, setCategory] = useState('Dania Główne');

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
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !price) return;

        const parsedPrice = parseFloat(price);
        if (parsedPrice < 0) {
            alert("Cena nie może być mniejsza niz 0 zł!");
            return;
        }

        setIsSubmitting(true);
        try {
            let finalImageUrl = existingImageUrl;

            if (imageFile) {
                const uniqueFileName = `${Date.now()}-${imageFile.name}`;
                const storageRef = ref(storage, `menu-images/${uniqueFileName}`);

                await uploadBytes(storageRef, imageFile);

                finalImageUrl = await getDownloadURL(storageRef);
            }

            if (editingId) {
                const itemRef = doc(db, 'menu', editingId);
                await updateDoc(itemRef, {
                    name: name,
                    price: parsedPrice,
                    description: description,
                    imageUrl: finalImageUrl,
                    category: category
                });
            } else {
                await addDoc(collection(db, 'menu'), {
                    name: name,
                    price: parsedPrice,
                    description: description,
                    imageUrl: finalImageUrl,
                    available: true,
                    category: category
                });
            }
            resetForm();

            document.getElementById('file-upload').value = '';
        } catch (error) {
            console.error("Błąd zapisu:", error);
            alert("Wystąpił błąd podczas zapisywania.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (item) => {
        setEditingId(item.id);
        setName(item.name);
        setPrice(item.price);
        setDescription(item.description || '');
        setExistingImageUrl(item.imageUrl || '');
        setImageFile(null);
        setCategory(item.category || 'Dania Główne');

        const fileInput = document.getElementById('file-upload');
        if(fileInput) fileInput.value = '';

        window.scrollTo({top: 0, behavior: 'smooth'});
    };

    const resetForm = () => {
        setEditingId(null);
        setName('');
        setPrice('');
        setDescription('');
        setExistingImageUrl('');
        setImageFile(null);
        setCategory('Dania Główne');
        const fileInput = document.getElementById('file-upload');
        if (fileInput) fileInput.value = '';
    };

    const handleToggleVisibility = async (id, currentStatus) => {
        try {
            const itemRef = doc(db, 'menu', id);
            const isCurrentlyAvailable = currentStatus !== false;

            await updateDoc(itemRef, {
                available: !isCurrentlyAvailable
            });
        } catch (error) {
            console.error("Błąd zmiany widoczności:", error);
        }
    }

    // usuwanie dania
    const handleDelete = async (id) => {
        if (window.confirm("Czy na pewno chcesz usunąć tę pozycje z menu?")) {
            try {
                await deleteDoc(doc(db, 'menu', id));
                if (editingId === id) resetForm();
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
                    <form className="manager-form" onSubmit={handleSubmit}>
                        <h3>{editingId ? 'Edytuj pozycję' : 'Dodaj danie'}</h3>

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
                            <label className="form-label">Kategoria</label>
                            <select
                                className="form-input"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}>
                                <option value="Przystawki">Przystawki</option>
                                <option value="Dania Główne">Dania Główne</option>
                                <option value="Napoje">Napoje</option>
                                <option value="Desery">Desery</option>
                            </select>
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
                            {editingId && existingImageUrl && (
                                <p style={{fontSize: '0.85rem', color: '#10b981', marginBottom: '0.5rem'}}>
                                    Ta pozycja ma już przypisane zdjęcie. Wgraj plik tylko, jeśli chcesz je zmienić.
                                </p>
                            )}
                            <input
                                id="file-upload"
                                type="file"
                                accept="image/*"
                                className="form-input"
                                onChange={(e) => setImageFile(e.target.files[0])}
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn-submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Przetwarzanie...' : (editingId ? 'Zapisz zmiany' : 'Dodaj do Menu')}
                            </button>

                            {editingId && (
                                <button type="button" className="btn-cancel" onClick={resetForm} disabled={isSubmitting}>
                                    Anuluj edycję
                                </button>
                            )}
                        </div>
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
                                        <img src={item.imageUrl} alt="" style={{width: '50px', height: '50px', borderRadius: '4px', objectFit: 'cover'}} />
                                    )}
                                    <div className="manager-item-info">
                                        <h4>{item.name}</h4>
                                        <p>{item.description}</p>
                                        <strong style={{color: '#2563eb'}}>{item.price.toFixed(2)} zł</strong>
                                    </div>
                                </div>
                                <div className="manager-item-actions">
                                    <button
                                        type="button"
                                        className={`btn-toggle ${item.available !== false ? 'btn-toggle-on' : 'btn-toggle-off'}`}
                                        onClick={() => handleToggleVisibility(item.id, item.available)}>
                                        {item.available !== false ? 'Widoczne' : 'Ukryte'}
                                    </button>
                                    <button
                                        className="btn-edit"
                                        onClick={() => handleEditClick(item)}>
                                        Edytuj
                                    </button>
                                    <button
                                        className="btn-delete"
                                        onClick={() => handleDelete(item.id)}>
                                        Usuń
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}