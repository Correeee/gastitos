import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Trash2, Plus, Share2, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../config/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import '../App.css';

import '../App.css';

const colorPalette = [
  '#ff4d4f', // Red/Orange (Brand color)
  '#1890ff', // Blue
  '#52c41a', // Green
  '#722ed1', // Purple
  '#faad14', // Yellow/Gold
  '#13c2c2', // Cyan
  '#eb2f96', // Pink
  '#fa541c'  // Volcano
];
const getColor = (index) => colorPalette[index % colorPalette.length];
const formatMoney = (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value || 0);
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export const RoomView = () => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const [persons, setPersons] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);

  // Firestore Real-time Sync
  useEffect(() => {
    if (!roomId) return;

    const roomRef = doc(db, 'rooms', roomId);
    let isRedirecting = false;

    const unsubscribe = onSnapshot(roomRef, async (docSnap) => {
      if (isRedirecting) return;

      if (docSnap.exists()) {
        const data = docSnap.data();

        // If user is logged in but NOT a member of this room
        if (currentUser && !data.members?.includes(currentUser.uid) && data.createdBy !== currentUser.uid) {
          isRedirecting = true;
          // Check if user is already pending
          const isPending = data.pendingMembers?.some(p => p.id === currentUser.uid);

          if (!isPending) {
            const newPendingData = {
              id: currentUser.uid,
              name: currentUser.displayName?.split(' ')[0] || 'Usuario',
              photoURL: currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName?.charAt(0) || 'U'}&background=random`
            };

            try {
              await updateDoc(roomRef, {
                pendingMembers: arrayUnion(newPendingData),
                pendingUids: arrayUnion(currentUser.uid)
              });

              const creatorData = data.persons?.find(p => p.id === data.createdBy);
              const creatorName = creatorData ? creatorData.name : 'el creador';

              toast.success(`Solicitud de acceso enviada a ${creatorName}, espere a ser aceptado.`, { duration: 5000 });
            } catch (error) {
              console.error("Error setting pending member from URL:", error);
            }
          } else {
            toast.success("Tu solicitud ya está pendiente de aprobación.");
          }

          navigate('/dashboard');
          return;
        }

        // Only set if field exists to prevent undefined errors
        if (data.persons && data.persons.length > 0) {
          setPersons(data.persons);
        }

        if (data.createdBy === currentUser?.uid) {
          setIsCreator(true);
        }

        if (data.expenses) setExpenses(data.expenses);

        setLoading(false);
      } else {
        toast.error("La sala no existe.");
        navigate('/dashboard');
      }
    });

    return unsubscribe;
  }, [roomId, currentUser]);

  // Derived state (Calculations)
  const totalIncome = useMemo(() => persons.reduce((acc, p) => acc + (parseFloat(p.salary) || 0), 0), [persons]);
  const totalExpenses = useMemo(() => expenses.reduce((acc, exp) => acc + exp.amount, 0), [expenses]);

  const personsWithPercent = useMemo(() => {
    return persons.map((p, index) => {
      const salary = parseFloat(p.salary) || 0;
      const percent = totalIncome > 0 ? (salary / totalIncome) * 100 : (100 / (persons.length || 1));
      return { 
        ...p, 
        percent,
        color: p.color && p.color !== '#000000' ? p.color : getColor(index)
      };
    });
  }, [persons, totalIncome]);

  // Sync to database helper
  const saveToDB = async (newPersons, newExpenses) => {
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        ...(newPersons && { persons: newPersons }),
        ...(newExpenses && { expenses: newExpenses })
      });
    } catch (e) {
      console.error("Error saving data:", e);
    }
  };

  // Handlers
  const handleAddPerson = () => {
    // This is kept for manual additions if needed, but normally handled by joining
    const newPersons = [...persons, { id: generateId(), name: `Persona ${persons.length + 1}`, salary: '', color: getColor(persons.length) }];
    setPersons(newPersons); // Optimistic UI
    saveToDB(newPersons, null);
  };

  const handleUpdatePerson = (id, field, value) => {
    const newPersons = persons.map(p => p.id === id ? { ...p, [field]: value } : p);
    setPersons(newPersons);
    saveToDB(newPersons, null);
  };

  const handleRemovePerson = async (id) => {
    // Prevent removing the last person
    if (persons.length <= 1) return;
    const newPersons = persons.filter(p => p.id !== id).map((p, idx) => ({ ...p, color: getColor(idx) }));
    setPersons(newPersons); // Optimistic UI

    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        persons: newPersons,
        members: arrayRemove(id)
      });
    } catch (e) {
      console.error("Error removing person:", e);
    }
  };

  const handleAddExpense = () => {
    const amount = parseFloat(expenseAmount);
    if (expenseName.trim() && !isNaN(amount) && amount > 0) {
      const newExpenses = [...expenses, { id: generateId(), name: expenseName.trim(), amount }];
      setExpenses(newExpenses);
      setExpenseName('');
      setExpenseAmount('');
      saveToDB(null, newExpenses);
    }
  };

  const handleRemoveExpense = (id) => {
    const newExpenses = expenses.filter(e => e.id !== id);
    setExpenses(newExpenses);
    saveToDB(null, newExpenses);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando sala...</div>;

  return (
    <div className="app-container">
      <header className="app-header mb-8">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <Button variant="secondary" className="!w-auto !py-2 !px-4" onClick={() => navigate('/dashboard')}>
            ← Volver a Salas
          </Button>

          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <img
                src={currentUser?.photoURL || `https://ui-avatars.com/api/?name=${currentUser?.displayName?.charAt(0) || 'U'}&background=random`}
                alt="Profile"
                title={currentUser?.displayName}
                style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #e5e7eb', objectFit: 'cover' }}
                onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${currentUser?.displayName?.charAt(0) || 'U'}&background=random`; }}
              />
              <Button variant="primary" onClick={logout} style={{ padding: '0.5em 1em' }}>
                <LogOut size={16} style={{ display: 'inline', marginRight: '8px' }} /> Salir
              </Button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={
            isCreator ? { 
              fontSize: '0.75rem', fontWeight: 700, borderRadius: '12px',
              padding: '4px 12px', textTransform: 'uppercase', letterSpacing: '0.5px',
              color: '#389e0d', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f'
            } : {
              fontSize: '0.75rem', fontWeight: 700, borderRadius: '12px',
              padding: '4px 12px', textTransform: 'uppercase', letterSpacing: '0.5px',
              color: '#d46b08', backgroundColor: '#fff7e6', border: '1px solid #ffd591'
            }
          }>
            {isCreator ? 'Creador' : 'Invitado'}
          </span>
          <span className="bg-gray-100 font-mono px-6 py-2 rounded-full text-sm" style={{ fontWeight: 600, color: '#ff4d4f', padding: '0.5em 1em' }}>
            SALA: {roomId}
          </span>
          <Button variant="primary" onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
            toast.success('¡Enlace de sala copiado! Envíaselo a tus amigos.');
          }} style={{ padding: '0.5em 1em' }}>
            <Share2 size={16} style={{ display: 'inline', marginRight: '8px' }} /> Compartir
          </Button>
        </div>

        <h1 className="text-3xl font-medium tracking-tight mb-2">División de Gastos</h1>
        <p>Calculadora de gastos compartidos proporcionales</p>
      </header>

      <main className="grid-layout" style={{ marginTop: '2rem' }}>

        {/* Ingresos Section */}
        <Card variant="light">
          <h2>Ingresos Mensuales</h2>
          <p className="subtitle">Las personas unidas aparecen automáticamente aquí.</p>

          <div className="persons-list custom-scrollbar">
            {personsWithPercent.map((person, index) => (
              <div key={person.id} className="person-item animate-fade-in">
                {person.photoURL ? (
                  <img
                    src={person.photoURL}
                    alt={person.name}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                    onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${person.name ? person.name.charAt(0) : 'U'}&background=random`; }}
                  />
                ) : (
                  <div style={{ width: '32px', height: '32px' }}></div>
                )}
                <input
                  type="text"
                  className="name-input"
                  value={person.name}
                  onChange={(e) => handleUpdatePerson(person.id, 'name', e.target.value)}
                  placeholder={`Persona ${index + 1}`}
                  readOnly={!isCreator && currentUser?.uid !== person.id}
                />
                <div className="input-wrapper amount-wrapper">
                  <span className="currency-symbol">$</span>
                  <input
                    type="number"
                    value={person.salary}
                    onChange={(e) => handleUpdatePerson(person.id, 'salary', e.target.value)}
                    placeholder="Sueldo"
                    min="0" step="any"
                    readOnly={!isCreator && currentUser?.uid !== person.id}
                  />
                </div>
                {isCreator && currentUser?.uid !== person.id ? (
                  <button className="btn-delete" onClick={() => handleRemovePerson(person.id)} title="Eliminar persona">
                    <Trash2 size={18} />
                  </button>
                ) : (
                  <div style={{ width: '24px' }}></div>
                )}
              </div>
            ))}
          </div>

          <div className="salary-stats mt-auto">
            <div className="stat-item flex justify-between mb-4">
              <span className="stat-label">Ingreso Total</span>
              <span className="stat-value font-medium text-xl">{formatMoney(totalIncome)}</span>
            </div>

            <div className="bars-wrapper">
              <div className="bars-labels flex flex-wrap gap-4 text-xs text-gray-600 mb-2">
                {personsWithPercent.map(p => (
                  <div key={p.id} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
                    <span><strong>{p.name || 'Sin nombre'}</strong>: {p.percent.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              <div className="bars-container flex h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                {personsWithPercent.map(p => (
                  <div key={p.id} className="bar-fill transition-all duration-300" style={{ backgroundColor: p.color, width: `${p.percent}%` }}></div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Gastos Section */}
        <Card variant="light">
          <h2>Lista de Gastos</h2>
          <p className="subtitle">Agrega los gastos compartidos del mes.</p>

          <div className="add-expense-form flex flex-col gap-3 mb-6">
            <input
              type="text"
              value={expenseName}
              onChange={(e) => setExpenseName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddExpense()}
              placeholder="Concepto (Ej. Alquiler)"
            />
            <div className="input-wrapper amount-wrapper">
              <span className="currency-symbol">$</span>
              <input
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddExpense()}
                placeholder="0.00" min="0" step="any"
              />
            </div>
            <Button variant="primary" onClick={handleAddExpense}>Añadir</Button>
          </div>

          <div className="expenses-list custom-scrollbar">
            {expenses.length === 0 ? (
              <div className="empty-state">No hay gastos añadidos aún.</div>
            ) : (
              expenses.map(exp => (
                <div key={exp.id} className="expense-item animate-fade-in flex justify-between items-center py-3 border-b border-dotted border-gray-300">
                  <span className="expense-info text-gray-900">{exp.name}</span>
                  <div className="expense-amount-del flex items-center gap-4 text-gray-600">
                    <span>{formatMoney(exp.amount)}</span>
                    <button className="btn-delete hover:text-red-500" onClick={() => handleRemoveExpense(exp.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="total-expenses mt-auto pt-4 border-t border-dotted border-gray-300">
            <span className="text-sm text-gray-500">Total de Gastos</span>
            <span className="block text-2xl font-medium text-gray-900 mt-1">{formatMoney(totalExpenses)}</span>
          </div>
        </Card>

        {/* Resultados Section */}
        <Card variant="dark" className="results-card">
          <h2>Resultados Finales</h2>
          <p className="subtitle text-gray-600">División proporcional sugerida.</p>

          <div className="results-grid custom-scrollbar flex-grow overflow-y-auto pr-2 mb-8 flex flex-col gap-6">
            {totalExpenses === 0 || personsWithPercent.every(p => !p.salary) ? (
              <div className="empty-state text-gray-700">Añade sueldos y gastos para ver los resultados.</div>
            ) : (
              personsWithPercent.map(p => {
                const shareAmount = totalExpenses * (p.percent / 100);
                return (
                  <div key={p.id} className="result-box animate-fade-in pb-6 border-b border-dotted border-black/20 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-2">
                      {p.photoURL ? (
                        <img
                          src={p.photoURL}
                          alt={p.name}
                          style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                          onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${p.name ? p.name.charAt(0) : 'U'}&background=random`; }}
                        />
                      ) : (
                        <img
                          src={`https://ui-avatars.com/api/?name=${p.name ? p.name.charAt(0) : 'U'}&background=random`}
                          alt={p.name}
                          style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      )}
                      <h3 className="text-sm text-black m-0 font-medium">
                        {p.name || 'Sin nombre'}
                      </h3>
                    </div>
                    <div className="text-4xl font-medium mb-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      {formatMoney(shareAmount)}
                    </div>
                    <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{p.percent.toFixed(1)}%</span> del total
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>

      </main>
    </div>
  );
};
