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
    const [ingredients, setIngredients] = useState([]);

    //stany dla formularza składników
    const [ingName, setIngName] = useState('');
    const [ingType, setIngType] = useState('main');
    const [ingCategory, setIngCategory] = useState('Warzywa');
    const [ingWeight, setIngWeight] = useState('');

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

    const handleAddIngredient = () => {
        if (!ingName.trim()) return;

        const weightVal = ingWeight !== '' ? Number(ingWeight) : null;

        if (weightVal !== null && weightVal < 0) {
            alert("Gramatura nie może być mniejsza niż 0!");
            return;
        }

        const newIngredient = {
            id: `ing_${Date.now()}`,
            name: ingName.trim(),
            type: ingType,
            category: ingCategory,
            weight: weightVal
        };

        setIngredients([...ingredients, newIngredient]);

        setIngName('');
        setIngWeight('');
    };

    const handleRemoveIngredient = (idToRemove) => {
        setIngredients(ingredients.filter(ing => ing.id !== idToRemove));
    };

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

                const metadata = {
                    cacheControl: 'public,max-age=31536000',
                };
                await uploadBytes(storageRef, imageFile, metadata);

                finalImageUrl = await getDownloadURL(storageRef);
            }

            if (editingId) {
                const itemRef = doc(db, 'menu', editingId);
                await updateDoc(itemRef, {
                    name: name,
                    price: parsedPrice,
                    description: description,
                    imageUrl: finalImageUrl,
                    category: category,
                    ingredients: ingredients
                });
            } else {
                await addDoc(collection(db, 'menu'), {
                    name: name,
                    price: parsedPrice,
                    description: description,
                    imageUrl: finalImageUrl,
                    available: true,
                    category: category,
                    ingredients: ingredients
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
        setIngredients(item.ingredients || []);

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
        setIngredients([]);
        setIngName('');
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

    const displayOrder = ['Przystawki', 'Dania Główne', 'Napoje', 'Desery'];

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

                        {/* Składniki*/}
                        <div className="form-group" style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                            <label className="form-label" style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                                Składniki i Gramatura
                            </label>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                                {ingredients.length === 0 && <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Brak składników</span>}

                                {ingredients.map(ing => (
                                    <div key={ing.id} className={`ingredient-pill ${ing.type}`}>
                                        <span>
                                            {ing.name} {ing.weight && <span style={{opacity: 0.8, fontSize: '0.8em'}}>({ing.weight}g)</span>}
                                        </span>
                                        <button type="button" onClick={() => handleRemoveIngredient(ing.id)} className="btn-remove-ing">×</button>
                                    </div>
                                ))}
                            </div>

                            {/* Dodawanie nowego składnika */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    placeholder="Nazwa (np. Ser Cheddar)"
                                    className="form-input"
                                    value={ingName}
                                    onChange={(e) => setIngName(e.target.value)}
                                />
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Gramatura w gramach (opcja)"
                                    className="form-input"
                                    value={ingWeight}
                                    onChange={(e) => setIngWeight(e.target.value)}
                                />
                                <select className="form-input" value={ingType} onChange={(e) => setIngType(e.target.value)}>
                                    <option value="main">Składnik Główny (obowiązkowy)</option>
                                    <option value="addon">Dodatek (zmienny/opcjonalny)</option>
                                </select>
                                <select className="form-input" value={ingCategory} onChange={(e) => setIngCategory(e.target.value)}>
                                    <option value="Mięso">Mięso</option>
                                    <option value="Warzywa">Warzywa</option>
                                    <option value="Sery">Sery</option>
                                    <option value="Sosy">Sosy</option>
                                    <option value="Inne">Inne</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={handleAddIngredient}
                                    style={{ gridColumn: '1 / -1', padding: '0.5rem', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    + Dodaj składnik do listy
                                </button>
                            </div>
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
                        {displayOrder.map(catName => {
                            const itemsInCategory = menuItems.filter(item => (item.category || 'Dania Główne') === catName);

                            if (itemsInCategory.length === 0) return null;

                            return (
                                <div key={catName} className="manager-category-group" style={{ marginBottom: '2rem' }}>
                                    <h4 style={{
                                        backgroundColor: '#f3f4f6',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '0.5rem',
                                        color: '#374151',
                                        borderLeft: '4px solid #3b82f6',
                                        marginBottom: '1rem',
                                        fontSize: '1rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {catName}
                                    </h4>

                                    {/* Lista dań wewnątrz kategorii */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {itemsInCategory.map(item => (
                                            <div key={item.id} className="manager-item">
                                                <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                                                    {item.imageUrl && item.imageUrl.trim() !== "" && (
                                                        <img src={item.imageUrl} alt="" style={{width: '50px', height: '50px', borderRadius: '4px', objectFit: 'cover'}} />
                                                    )}
                                                    <div className="manager-item-info">
                                                        <h4>{item.name}</h4>
                                                        <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                                            Składniki: {item.ingredients?.length || 0}
                                                        </p>
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
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}