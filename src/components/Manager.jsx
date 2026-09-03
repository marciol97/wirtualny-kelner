import React, {useState, useEffect} from "react";
import './Manager.css';
import {collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc, query, where, getDocs, setDoc} from "firebase/firestore";
import {ref, uploadBytes, getDownloadURL} from "firebase/storage";
import {db, storage} from "../firebase.js";
import {QRCodeSVG} from "qrcode.react";
import {printQRCodesWindow} from "./printQR.js";

export default function Manager() {
    const [activeTab, setActiveTab] = useState('menu');

    const [menuItems, setMenuItems] = useState([]);
    const [ordersHistory, setOrdersHistory] = useState([]);

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

    //stany dla kodów qr
    const [qrCodes, setQrCodes] = useState([]);
    const [tableNumInput, setTableNumInput] = useState('');
    const [selectedQRs, setSelectedQRs] = useState([]);

    //stany dla zmiany kodu PIN
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    //stany filtra sprzedaży
    const [salesFilter, setSalesFilter] = useState('today');
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
    const [sortConfig, setSortConfig] = useState({ key: 'qty', direction: 'desc' });

    // pobieranie menu z bazy
    useEffect(() => {
        const unsubscribeMenu = onSnapshot(collection(db, 'menu'), (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id, ...doc.data()
            }));
            setMenuItems(items);
        });

        const unsubscribeQR = onSnapshot(collection(db, 'qr_codes'), (snapshot) => {
            const qrs = snapshot.docs.map(doc => ({
                id: doc.id, ...doc.data()
            }));
            qrs.sort((a, b) => a.tableNumber - b.tableNumber);
            setQrCodes(qrs);
        });

        const unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
            const fetchedOrders = snapshot.docs.map(doc => ({
                id: doc.id, ...doc.data()
            }));
            setOrdersHistory(fetchedOrders);
        });

        return () => {
            unsubscribeMenu();
            unsubscribeQR();
            unsubscribeOrders();
        };
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
    };

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

    // lokgika kodów QR
    const handleGenerateQR = async(e) => {
        e.preventDefault();
        const num = parseInt(tableNumInput);
        if (isNaN(num) || num < 1 || num > 100) return alert("Podaj prawidłowy numer stolika w zakresie 1-100.");

        const existingQR = qrCodes.find(qr => qr.tableNumber === num);

        if (existingQR) {
            const confirmOverrite = window.confirm(`Kod do tego stolika (${num}) już istnieje. Czy na pewno chcesz wygenerować nowy kod?`);
            if (!confirmOverrite) return;

            await deleteDoc(doc(db, 'qr_codes', existingQR.id));
        }

        const currentDomain = window.location.origin;
        const generatedUrl = `${currentDomain}/?table=${num}`;

        try {
            await addDoc(collection(db, 'qr_codes'), {
                tableNumber: num,
                url: generatedUrl,
                createdAt: new Date()
            });
            setTableNumInput('');
        } catch (error) {
            console.error("Błąd podczas generowania QR:", error);
        }
    };

    const handleDeleteQR = async (id, tableNum) => {
        try {
            const billQuery = query(
                collection(db, 'bills'),
                where('tableNumber', '==', tableNum),
                where('status', '==', 'open')
            );
            const billSnapshot = await getDocs(billQuery);

            if (!billSnapshot.empty) {
                alert(`BŁĄD: Stolik nr ${tableNum} ma aktualnie otwarty rachunek! Musi on zostać zamknięty (opłacony), zanim usuniesz przypisanie stolika.`);
                return;
            }

            if (window.confirm(`Czy na pewno chcesz usunąć kod QR dla stolika (${tableNum})?`)) {
                await deleteDoc(doc(db, 'qr_codes', id));
                setSelectedQRs(prev => prev.filter(qrId => qrId !== id));
            }
        } catch (error) {
            console.error("Błąd podczas usuwania kodu QR:", error);
        }
    };

    const handleSelectQR = (id) => {
        setSelectedQRs(prev => prev.includes(id) ? prev.filter(qrId => qrId !== id) : [...prev, id]);
    };

    // Obsługa drukowania przez osobne okno
    const handlePrintSelected = () => {
        const itemsToPrint = qrCodes.filter(qr => selectedQRs.includes(qr.id));
        if (itemsToPrint.length === 0) {
            return alert("Najpierw zaznacz kody, które chcesz wydrukować.");
        }
        printQRCodesWindow(itemsToPrint);
    };

    const handleSelectAllAndPrint = () => {
        if (qrCodes.length === 0) {
            return alert("Brak kodów w systemie.");
        }
        printQRCodesWindow(qrCodes);
    };

    //Logika zmiany kodu PIN
    const handlePinChange = async (e) => {
        e.preventDefault();

        if (newPin !== confirmPin) {
            return alert("Wpisane kody PIN nie są identyczne!");
        }

        if (!/^\d{4}$/.test(newPin)) {
            return alert("Kod PIN musi składać się z dokładnie 4 cyfr!");
        }

        try {
            await setDoc(doc(db, 'settings', 'security'), {
                managerPin: newPin
            }, { merge: true });

            alert("Kod PIN został pomyślnie zmieniony!");
            setNewPin('');
            setConfirmPin('');
        } catch (error) {
            console.error("Błąd podczas zmiany PIN:", error);
            alert("Nie udało się zmienić kodu PIN.");
        }
    };

    //funckja sortowania
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key: key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    //Logika raportu sprzedaży
    const getFilteredSalesData = () => {
        const now = new Date();
        let startDate = new Date(0);
        let endDate = new Date('9999-12-31T23:59:59');

        if (salesFilter === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        } else if (salesFilter === 'week') {
            const firstDay = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1);
            startDate = new Date(now.setDate(firstDay));
            startDate.setHours(0, 0, 0, 0);
        } else if (salesFilter === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (salesFilter === 'custom' && customDate) {
            const [year, month, day] = customDate.split('-');
            startDate = new Date(year, month - 1, day);
            endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
        }

        const filteredOrders = ordersHistory.filter(order => {
            if (!order.createdAt) return false;
            const orderDate = order.createdAt.toDate();
            return orderDate >= startDate && orderDate <= endDate;
        });

        let totalRevenue = 0;
        const itemStats = {};

        filteredOrders.forEach(order => {
            if (order.items) {
                order.items.forEach(item => {
                    const lineTotal = item.price * item.quantity;
                    totalRevenue += lineTotal;

                    if (!itemStats[item.productId]) {
                        itemStats[item.productId] = { name: item.name, qty: 0, revenue: 0 };
                    }
                    itemStats[item.productId].qty += item.quantity;
                    itemStats[item.productId].revenue += lineTotal;
                });
            }
        });

        const bestsellers = Object.values(itemStats).sort((a, b) => {
            if (sortConfig.key === 'qty') {
                return sortConfig.direction === 'desc' ? b.qty - a.qty : a.qty - b.qty;
            } else {
                return sortConfig.direction === 'desc' ? b.revenue - a.revenue : a.revenue - b.revenue;
            }
        });

        return { totalRevenue, bestsellers, ordersCount: filteredOrders.length };
    };

    const getFilterDescriptionText = () => {
        const now = new Date();

        if (salesFilter === 'today') {
            const todayStr = now.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
            return `Sprzedaż w dniu: ${todayStr}`;
        }

        if (salesFilter === 'week') {
            const currentDay = now.getDay();
            const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() + distanceToMonday);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);

            const startStr = startOfWeek.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const endStr = endOfWeek.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });

            return `Sprzedaż w dniach: ${startStr} - ${endStr}`;
        }

        if (salesFilter === 'month') {
            const monthStr = now.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
            return `Sprzedaż: ${monthStr.charAt(0).toUpperCase() + monthStr.slice(1)}`;
        }

        if (salesFilter === 'all') {
            return `Zestawienie całkowite (od początku działania)`;
        }

        if (salesFilter === 'custom' && customDate) {
            const [year, month, day] = customDate.split('-');
            const customDateObj = new Date(year, month - 1, day);
            const customStr = customDateObj.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
            return `Sprzedaż w dniu: ${customStr}`;
        }

        return '';
    };

    const salesData = getFilteredSalesData();
    const displayOrder = ['Przystawki', 'Dania Główne', 'Napoje', 'Desery'];

    return (
        <div className="manager-container">
            <h2 className="manager-header">Panel Menadżera</h2>

            {/* zakładki menadżera */}
            <div className="manager-tabs">
                <button
                    className={`tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
                    onClick={() => setActiveTab('menu')}
                >
                    Zarządzanie Menu
                </button>
                <button
                    className={`tab-btn ${activeTab === 'qr' ? 'active' : ''}`}
                    onClick={() => setActiveTab('qr')}
                >
                    Kody QR Stolików
                </button>
                <button className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>
                    Raporty Sprzedaży
                </button>
                <button
                    className={`tab-btn ${activeTab === 'auth' ? 'active' : ''}`}
                    onClick={() => setActiveTab('auth')}
                >
                    Autoryzacje i PIN
                </button>
            </div>

            {/* widok raport sprzedazy*/}
            {activeTab === 'sales' && (
                <div className="manager-layout" style={{ flexDirection: 'column' }}>

                    {/* Filtry Czasowe */}
                    <div className="sales-filters-wrapper">
                        <div className="sales-date-group">
                            <label className="sales-date-label">Konkretny dzień:</label>
                            <input
                                type="date"
                                className={`sales-date-input ${salesFilter === 'custom' ? 'active' : ''}`}
                                value={customDate}
                                onChange={(e) => {
                                    setCustomDate(e.target.value);
                                    setSalesFilter('custom');
                                }}
                            />
                        </div>

                        <div className="sales-filter-divider"></div>

                        <button className={`sales-filter-btn ${salesFilter === 'today' ? 'active' : ''}`} onClick={() => setSalesFilter('today')}>Dziś</button>
                        <button className={`sales-filter-btn ${salesFilter === 'week' ? 'active' : ''}`} onClick={() => setSalesFilter('week')}>Ten Tydzień</button>
                        <button className={`sales-filter-btn ${salesFilter === 'month' ? 'active' : ''}`} onClick={() => setSalesFilter('month')}>Ten Miesiąc</button>
                        <button className={`sales-filter-btn ${salesFilter === 'all' ? 'active' : ''}`} onClick={() => setSalesFilter('all')}>Cały Czas</button>
                    </div>

                    <div className="sales-period-label">
                        {getFilterDescriptionText()}
                    </div>

                    {/* Karty Statystyk */}
                    <div className="sales-stats-grid">
                        <div className="sales-stat-card green">
                            <h4 className="sales-stat-title">Przychód Całkowity</h4>
                            <div className="sales-stat-value">{salesData.totalRevenue.toFixed(2)} zł</div>
                        </div>

                        <div className="sales-stat-card blue">
                            <h4 className="sales-stat-title">Złożone Zamówienia</h4>
                            <div className="sales-stat-value">{salesData.ordersCount}</div>
                        </div>
                    </div>

                    {/* Tabela Bestsellerów */}
                    <div className="sales-table-wrapper">
                        <h3 className="sales-table-header">Ranking sprzedaży produktów</h3>

                        {salesData.bestsellers.length === 0 ? (
                            <p style={{ color: '#6b7280', textAlign: 'center', padding: '3rem 1rem' }}>Brak danych sprzedażowych dla wybranego okresu.</p>
                        ) : (
                            <table className="sales-table">
                                <thead>
                                <tr>
                                    <th>Miejsce</th>
                                    <th>Produkt</th>

                                    <th className="sortable" onClick={() => handleSort('qty')} title="Kliknij, aby posortować">
                                        <span className={`sort-indicator ${sortConfig.key === 'qty' ? 'active' : ''}`}>
                                            Sprzedane sztuki
                                        </span>
                                    </th>

                                    <th className="sortable" style={{ textAlign: 'right' }} onClick={() => handleSort('revenue')} title="Kliknij, aby posortować">
                                        <span className={`sort-indicator ${sortConfig.key === 'revenue' ? 'active' : ''}`}>
                                            Wygenerowany przychód
                                        </span>
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                {salesData.bestsellers.map((item, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: 'bold', color: idx < 3 ? '#3b82f6' : '#6b7280' }}>#{idx + 1}</td>
                                        <td style={{ fontWeight: '500', color: '#1f2937' }}>{item.name}</td>
                                        <td style={{ color: '#4b5563' }}>{item.qty} szt.</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#111827' }}>{item.revenue.toFixed(2)} zł</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* widok panelu menu */}
            {activeTab === 'menu' && (
                <div className="manager-layout">
                    <div className="manager-form-section">
                        <form className="manager-form" onSubmit={handleSubmit}>
                            <h3>{editingId ? 'Edytuj pozycję' : 'Dodaj danie'}</h3>
                            <div className="form-group">
                                <label className="form-label">Nazwa dania</label>
                                <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Kategoria</label>
                                <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                                    <option value="Przystawki">Przystawki</option>
                                    <option value="Dania Główne">Dania Główne</option>
                                    <option value="Napoje">Napoje</option>
                                    <option value="Desery">Desery</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Cena (zł)</label>
                                <input type="number" step="0.01" min="0" className="form-input" value={price} onChange={(e) => setPrice(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Opis dania</label>
                                <textarea className="form-textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
                            </div>

                            <div className="form-group" style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                                <label className="form-label" style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                                    Składniki i Gramatura
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                                    {ingredients.length === 0 && <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Brak składników</span>}
                                    {ingredients.map(ing => (
                                        <div key={ing.id} className={`ingredient-pill ${ing.type}`}>
                                            <span>{ing.name} {ing.weight && <span style={{opacity: 0.8, fontSize: '0.8em'}}>({ing.weight}g)</span>}</span>
                                            <button type="button" onClick={() => handleRemoveIngredient(ing.id)} className="btn-remove-ing">×</button>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <input type="text" placeholder="Nazwa (np. Ser Cheddar)" className="form-input" value={ingName} onChange={(e) => setIngName(e.target.value)} />
                                    <input type="number" min="0" placeholder="Gramatura w gramach" className="form-input" value={ingWeight} onChange={(e) => setIngWeight(e.target.value)} />
                                    <select className="form-input" value={ingType} onChange={(e) => setIngType(e.target.value)}>
                                        <option value="main">Składnik Główny</option>
                                        <option value="addon">Dodatek (opcjonalny)</option>
                                    </select>
                                    <select className="form-input" value={ingCategory} onChange={(e) => setIngCategory(e.target.value)}>
                                        <option value="Mięso">Mięso</option>
                                        <option value="Warzywa">Warzywa</option>
                                        <option value="Sery">Sery</option>
                                        <option value="Sosy">Sosy</option>
                                        <option value="Inne">Inne</option>
                                    </select>
                                    <button type="button" onClick={handleAddIngredient} style={{ gridColumn: '1 / -1', padding: '0.5rem', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 'bold' }}>
                                        + Dodaj składnik do listy
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Wgraj zdjęcie (opcjonalnie)</label>
                                {editingId && existingImageUrl && (
                                    <p style={{fontSize: '0.85rem', color: '#10b981', marginBottom: '0.5rem'}}>Ta pozycja ma już zdjęcie. Wgraj plik tylko, jeśli chcesz je zmienić.</p>
                                )}
                                <input id="file-upload" type="file" accept="image/*" className="form-input" onChange={(e) => setImageFile(e.target.files[0])} />
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn-submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Przetwarzanie...' : (editingId ? 'Zapisz zmiany' : 'Dodaj do Menu')}
                                </button>
                                {editingId && (
                                    <button type="button" className="btn-cancel" onClick={resetForm} disabled={isSubmitting}>Anuluj edycję</button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="manager-list-section">
                        <h3>Obecne menu ({menuItems.length} pozycji)</h3>
                        <div className="manager-list">
                            {displayOrder.map(catName => {
                                const itemsInCategory = menuItems.filter(item => (item.category || 'Dania Główne') === catName);
                                if (itemsInCategory.length === 0) return null;
                                return (
                                    <div key={catName} className="manager-category-group" style={{ marginBottom: '2rem' }}>
                                        <h4 style={{ backgroundColor: '#f3f4f6', padding: '0.5rem 1rem', borderRadius: '0.5rem', color: '#374151', borderLeft: '4px solid #3b82f6', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {catName}
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {itemsInCategory.map(item => (
                                                <div key={item.id} className="manager-item">
                                                    <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                                                        {item.imageUrl && item.imageUrl.trim() !== "" && (
                                                            <img src={item.imageUrl} alt="" style={{width: '50px', height: '50px', borderRadius: '4px', objectFit: 'cover'}} />
                                                        )}
                                                        <div className="manager-item-info">
                                                            <h4>{item.name}</h4>
                                                            <strong style={{color: '#2563eb'}}>{item.price.toFixed(2)} zł</strong>
                                                        </div>
                                                    </div>
                                                    <div className="manager-item-actions">
                                                        <button type="button" className={`btn-toggle ${item.available !== false ? 'btn-toggle-on' : 'btn-toggle-off'}`} onClick={() => handleToggleVisibility(item.id, item.available)}>
                                                            {item.available !== false ? 'Widoczne' : 'Ukryte'}
                                                        </button>
                                                        <button className="btn-edit" onClick={() => handleEditClick(item)}>Edytuj</button>
                                                        <button className="btn-delete" onClick={() => handleDelete(item.id)}>Usuń</button>
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
            )}

            {/* widok kodów QR */}
            {activeTab === 'qr' && (
                <div className="manager-qr-section">

                    {/* formularz*/}
                    <div className="qr-generator-form">
                        <h3>Wygeneruj nowy kod QR</h3>
                        <form onSubmit={handleGenerateQR} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                <label className="form-label">Numer stolika</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    className="form-input"
                                    value={tableNumInput}
                                    onChange={(e) => setTableNumInput(e.target.value)}
                                    placeholder="Wpisz nr stolika"
                                    required
                                />
                            </div>
                            <button type="submit" className="btn-submit" style={{ width: 'auto', padding: '0.75rem 2rem', margin: 0 }}>
                                Wygeneruj Kod
                            </button>
                        </form>
                    </div>

                    {/* lista kodów qr z przypisanym id dla każdego stolika */}
                    <div className="qr-grid">
                        {qrCodes.map(qr => (
                            <div key={qr.id} id={`qr-card-${qr.id}`} className="qr-card">
                                <div className="qr-card-header">
                                    <label className="qr-checkbox-label">
                                        <input type="checkbox" checked={selectedQRs.includes(qr.id)} onChange={() => handleSelectQR(qr.id)} />
                                        <h4>Stolik {qr.tableNumber}</h4>
                                    </label>
                                    <button className="btn-delete btn-sm" onClick={() => handleDeleteQR(qr.id, qr.tableNumber)}>Usuń</button>
                                </div>
                                <div className="qr-code-wrapper">
                                    <QRCodeSVG value={qr.url} size={160} level="H" includeMargin={true} />
                                    <span className="qr-url-text">{qr.url}</span>
                                </div>
                            </div>
                        ))}
                        {qrCodes.length === 0 && <p style={{ color: '#6b7280', gridColumn: '1 / -1', textAlign: 'center', marginTop: '2rem' }}>Brak wygenerowanych kodów QR.</p>}
                    </div>

                    {/* drukowanie kodów*/}
                    {qrCodes.length > 0 && (
                        <div className="qr-print-actions">
                            <button type="button" className="btn-submit btn-print" onClick={handlePrintSelected}>
                                Drukuj zaznaczone
                            </button>
                            <button type="button" className="btn-submit btn-print-all" onClick={handleSelectAllAndPrint}>
                                Drukuj wszystkie
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'auth' && (
                <div className="manager-layout" style={{ justifyContent: 'center', marginTop: '2rem' }}>
                    <div className="manager-form-section" style={{ maxWidth: '500px', width: '100%' }}>
                        <form className="manager-form" onSubmit={handlePinChange}>
                            <h3 style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem' }}>Autoryzacja Kelnerska</h3>
                            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                                Zmień główny kod PIN dla operacji wymagających autoryzacji (np. usuwanie pozycji z opłaconego rachunku).
                                Domyślny systemowy PIN to <strong>1111</strong>.
                            </p>

                            <div className="form-group">
                                <label className="form-label">Nowy 4-cyfrowy PIN</label>
                                <input
                                    type="password"
                                    maxLength="4"
                                    pattern="\d{4}"
                                    className="form-input"
                                    placeholder="Wpisz 4 cyfry"
                                    value={newPin}
                                    onChange={(e) => setNewPin(e.target.value)}
                                    style={{ fontSize: '1.5rem', letterSpacing: '0.5rem', textAlign: 'center' }}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Powtórz nowy PIN</label>
                                <input
                                    type="password"
                                    maxLength="4"
                                    pattern="\d{4}"
                                    className="form-input"
                                    placeholder="Powtórz 4 cyfry"
                                    value={confirmPin}
                                    onChange={(e) => setConfirmPin(e.target.value)}
                                    style={{ fontSize: '1.5rem', letterSpacing: '0.5rem', textAlign: 'center' }}
                                    required
                                />
                            </div>

                            <div className="form-actions" style={{ marginTop: '2rem' }}>
                                <button type="submit" className="btn-submit" style={{ width: '100%' }}>
                                    Zapisz nowy kod PIN
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}