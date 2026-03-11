import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Plus, Users, LogOut, Trash2, Share2, HelpCircle, Menu, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { HelpModal } from '../components/HelpModal';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';

const RoomMembersToast = ({ t, room, currentUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate the user list from room.persons or fallback
    const usersData = (room.members || []).map(uid => {
      const personData = (room.persons || []).find(p => p.id === uid);
      const isMe = uid === currentUser.uid;

      let displayName = personData?.name?.trim();

      if (!displayName || displayName.toLowerCase() === 'sin nombre') {
        if (isMe) {
          displayName = currentUser.email || 'Tú';
        } else {
          displayName = `Usuario ${uid.substring(0, 4)}`;
        }
      }

      let photoURL = personData?.photoURL;
      if (!photoURL) {
        if (isMe) {
          photoURL = currentUser.photoURL || `https://ui-avatars.com/api/?name=${displayName.charAt(0)}&background=random`;
        } else {
          photoURL = `https://ui-avatars.com/api/?name=${displayName.charAt(0)}&background=random`;
        }
      }

      return {
        id: uid,
        displayName,
        photoURL,
        isMe
      };
    });

    // Sort users so current user is always at the top
    usersData.sort((a, b) => {
      if (a.isMe) return -1;
      if (b.isMe) return 1;
      return 0;
    });

    setUsers(usersData);
    setLoading(false);
  }, [room.members, currentUser]);

  useEffect(() => {
    // Dismiss toast if user navigates away
    const handlePopState = () => toast.dismiss(t.id);
    window.addEventListener('popstate', handlePopState);

    // Dismiss toast on click outside
    const handleClickOutside = (e) => {
      // The toast library wraps contents in generic divs. 
      // A robust way to check if clicked outside is to assume any click outside our specific container should close it.
      // We'll attach an ID to our container to identify it.
      const el = document.getElementById(`room-members-toast-${t.id}`);
      if (el && !el.contains(e.target)) {
        toast.dismiss(t.id);
      }
    };

    // Use timeout to prevent immediate dismissal from the click that opened the toast
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [t.id]);


  const handleKick = async (uid) => {
    toast((tConfirm) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem' }}>
        <p style={{ margin: 0, fontWeight: 500 }}>¿Seguro que deseas eliminar a este usuario de la sala?</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button variant="secondary" style={{ padding: '0.5rem 1rem', width: 'auto' }} onClick={() => toast.dismiss(tConfirm.id)}>Cancelar</Button>
          <Button style={{ padding: '0.5rem 1rem', width: 'auto', backgroundColor: '#ff4d4f', color: 'white', border: 'none' }} onClick={async () => {
            toast.dismiss(tConfirm.id);
            try {
              const newMembers = room.members.filter(id => id !== uid);
              const newPersons = (room.persons || []).filter(p => p.id !== uid);
              await updateDoc(doc(db, 'rooms', room.id), {
                members: newMembers,
                persons: newPersons
              });
              toast.success("Usuario eliminado");
            } catch (e) {
              console.error("Error kicking user", e);
              toast.error("Error al eliminar usuario");
            }
          }}>Eliminar</Button>
        </div>
      </div>
    ), { duration: Infinity, style: { background: '#ffffff', color: '#111111', border: '1px solid #e5e7eb' } });
  };

  const handleApprove = async (pendingUser) => {
    try {
      const roomRef = doc(db, 'rooms', room.id);

      // We must query the current room state to determine the appropriate color index for the new person
      const roomSnap = await getDoc(roomRef);
      const currentData = roomSnap.data();
      const currentPersonsLength = currentData.persons?.length || 0;

      const colorPalette = ['#000000', '#b0b0b0', '#565656', '#222222', '#888888', '#e6e6e6'];
      const personData = {
        ...pendingUser,
        salary: '',
        color: colorPalette[currentPersonsLength % colorPalette.length]
      };

      const newPending = (currentData.pendingMembers || []).filter(p => p.id !== pendingUser.id);

      await updateDoc(roomRef, {
        members: arrayUnion(pendingUser.id),
        persons: arrayUnion(personData),
        pendingMembers: newPending,
        pendingUids: arrayRemove(pendingUser.id)
      });
      toast.success(`${pendingUser.name} ha sido aceptado`);
      // Dismiss the toast so the user can see the main UI logic update (or they can reopen it)
      toast.dismiss(t.id);
    } catch (error) {
      console.error("Error approving user:", error);
      toast.error("Error al aceptar usuario");
    }
  };

  const handleReject = async (pendingUserId) => {
    try {
      const roomRef = doc(db, 'rooms', room.id);
      const roomSnap = await getDoc(roomRef);
      const currentData = roomSnap.data();
      const newPending = (currentData.pendingMembers || []).filter(p => p.id !== pendingUserId);

      await updateDoc(roomRef, {
        pendingMembers: newPending,
        pendingUids: arrayRemove(pendingUserId)
      });
      toast.success("Solicitud rechazada");
      toast.dismiss(t.id);
    } catch (error) {
      console.error("Error rejecting user:", error);
      toast.error("Error al rechazar usuario");
    }
  };

  const isCreator = currentUser.uid === room.createdBy;

  return (
    <div id={`room-members-toast-${t.id}`} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem', minWidth: '250px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Miembros ({room.members?.length || 0})</h3>
        <button onClick={() => toast.dismiss(t.id)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>&times;</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto' }}>
        {loading ? <p style={{ fontSize: '0.875rem', color: '#666' }}>Cargando usuarios...</p> :
          users.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img
                  src={u.photoURL}
                  alt={u.displayName}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${u.displayName.charAt(0)}&background=random`; }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{u.displayName} {u.isMe && <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: '4px' }}>(Tú)</span>}</span>
                  {u.id === room.createdBy && (
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, borderRadius: '8px',
                      padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.5px',
                      color: '#389e0d', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f'
                    }}>
                      Creador
                    </span>
                  )}
                </div>
              </div>
              {!u.isMe && isCreator && (
                <button
                  onClick={() => handleKick(u.id)}
                  style={{ background: 'none', border: 'none', padding: '0.25rem', color: '#ff4d4f', cursor: 'pointer' }}
                  title="Eliminar usuario"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))
        }
      </div>

      {isCreator && room.pendingMembers && room.pendingMembers.length > 0 && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '0.5rem 0' }} />
          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#f59e0b' }}>
            Solicitudes Pendientes ({room.pendingMembers.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {room.pendingMembers.map(pending => (
              <div key={pending.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fef3c7', padding: '0.5rem', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', marginRight: '0.5rem' }}>
                  <img
                    src={pending.photoURL}
                    alt={pending.name}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${pending.name ? pending.name.charAt(0) : 'U'}&background=random`; }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pending.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    onClick={() => handleApprove(pending)}
                    style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    title="Aceptar"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => handleReject(pending.id)}
                    style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    title="Rechazar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [recentRooms, setRecentRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check if the user has seen the help modal before
    const hasSeenHelp = localStorage.getItem('hasSeenGastitosHelp');
    if (!hasSeenHelp) {
      setIsHelpOpen(true);
      localStorage.setItem('hasSeenGastitosHelp', 'true');
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const qMembers = query(
      collection(db, 'rooms'),
      where('members', 'array-contains', currentUser.uid)
    );

    const qPending = query(
      collection(db, 'rooms'),
      where('pendingUids', 'array-contains', currentUser.uid)
    );

    let membersData = [];
    let pendingData = [];

    const unsubscribeMembers = onSnapshot(qMembers, (snapshot) => {
      membersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentRooms([...membersData, ...pendingData].filter(r => !r.deleted));
      setLoading(false);
    });

    const unsubscribePending = onSnapshot(qPending, (snapshot) => {
      pendingData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isPendingForMe: true }));
      setRecentRooms([...membersData, ...pendingData].filter(r => !r.deleted));
      setLoading(false);
    });

    return () => {
      unsubscribeMembers();
      unsubscribePending();
    };
  }, [currentUser]);

  const createRoomWithName = async (roomName) => {
    const createRoomPromise = async () => {
      // Firebase security rules likely deny reading arbitrary rooms to check existence.
      // Therefore, we just generate a random code and attempt to create it. 
      // Collisions on a 6-char alphanumeric string are statistically negligible for this scope.
      const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      await setDoc(doc(db, 'rooms', newRoomCode), {
        name: roomName,
        createdBy: currentUser.uid,
        members: [currentUser.uid],
        persons: [{
          id: currentUser.uid,
          name: currentUser.displayName?.split(' ')[0] || 'Tú',
          photoURL: currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName?.charAt(0) || 'U'}&background=random`,
          salary: '',
          color: '#000000'
        }],
        createdAt: new Date().toISOString(),
        calculationMode: 'equitable'
      });

      return newRoomCode;
    };

    toast.promise(createRoomPromise(), {
      loading: 'Creando sala...',
      success: (newRoomCode) => {
        navigate(`/room/${newRoomCode}`);
        return `Sala creada: ${roomName}`;
      },
      error: (err) => {
        console.error("Firebase Room Creation Error:", err);
        return `Error: ${err.message || 'Hubo un error creando la sala.'}`;
      }
    });
  };

  const handleCreateRoom = () => {
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem' }}>
        <p style={{ margin: 0, fontWeight: 500 }}>¿Cómo quieres llamar a esta sala?</p>
        <input
          id="new-room-input"
          className="custom-input"
          style={{ padding: '0.75rem', fontSize: '1rem', textTransform: 'none', letterSpacing: 'normal' }}
          placeholder="Ej: Gastos - Marzo 2026"
          maxLength={20}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = e.target.value.trim();
              if (val.length > 20) {
                toast.error("El nombre no puede tener más de 30 caracteres", { id: 'too-long-name' });
                return;
              }
              if (val) {
                toast.dismiss(t.id);
                createRoomWithName(val);
              }
            }
          }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button
            variant="secondary"
            style={{ padding: '0.5rem 1rem', width: 'auto' }}
            onClick={() => toast.dismiss(t.id)}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            style={{ padding: '0.5rem 1rem', width: 'auto' }}
            onClick={() => {
              const val = document.getElementById('new-room-input')?.value.trim();
              if (!val) {
                toast.error("Coloca un nombre por favor", { id: 'empty-name' });
                return;
              }
              if (val.length > 20) {
                toast.error("El nombre no puede tener más de 20 caracteres", { id: 'too-long-name' });
                return;
              }
              toast.dismiss(t.id);
              createRoomWithName(val);
            }}
          >
            Crear Sala
          </Button>
        </div>
      </div>
    ), { duration: Infinity, style: { background: '#ffffff', color: '#111111', border: '1px solid #e5e7eb', width: '100%', maxWidth: '400px' } });
  };

  const colorPalette = ['#000000', '#b0b0b0', '#565656', '#222222', '#888888', '#e6e6e6'];
  const getColor = (index) => colorPalette[index % colorPalette.length];

  const handleJoinRoom = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 3) return;

    try {
      const roomRef = doc(db, 'rooms', code);
      const roomSnap = await getDoc(roomRef);

      if (roomSnap.exists()) {
        const data = roomSnap.data();

        // If the user created it or is already in the members list, let them right in
        if (data.createdBy === currentUser.uid || data.members?.includes(currentUser.uid)) {
          navigate(`/room/${code}`);
          return;
        }

        // Check if user is already pending
        const isPending = data.pendingMembers?.some(p => p.id === currentUser.uid);

        if (!isPending) {
          const newPendingData = {
            id: currentUser.uid,
            name: currentUser.displayName?.split(' ')[0] || 'Usuario',
            photoURL: currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName?.charAt(0) || 'U'}&background=random`
          };

          await updateDoc(roomRef, {
            pendingMembers: arrayUnion(newPendingData),
            pendingUids: arrayUnion(currentUser.uid)
          });

          // Find creator's name from the persons array
          const creatorData = data.persons?.find(p => p.id === data.createdBy);
          const creatorName = creatorData ? creatorData.name : 'el creador';

          toast.success(`Solicitud de acceso enviada a ${creatorName}, espere a ser aceptado.`, { duration: 5000 });
        } else {
          toast.success("Tu solicitud ya está pendiente de aprobación.");
        }
        setJoinCode('');
      } else {
        toast.error("El código de sala no existe.");
      }
    } catch (error) {
      console.error("Error uniendo a sala:", error);
      toast.error("No se pudo conectar a la sala.");
    }
  };

  const handleDeleteRoom = (room, e) => {
    e.stopPropagation();

    if (room.isPendingForMe) {
      toast((t) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem' }}>
          <p style={{ margin: 0, fontWeight: 500 }}>¿Estás seguro de cancelar tu solicitud de acceso a esta sala?</p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" style={{ padding: '0.5rem 1rem', width: 'auto' }} onClick={() => toast.dismiss(t.id)}>Atrás</Button>
            <Button style={{ padding: '0.5rem 1rem', width: 'auto', backgroundColor: '#ff4d4f', color: 'white', border: 'none' }} onClick={async () => {
              toast.dismiss(t.id);
              try {
                const roomRef = doc(db, 'rooms', room.id);
                const roomSnap = await getDoc(roomRef);
                const currentData = roomSnap.data();
                const newPending = (currentData.pendingMembers || []).filter(p => p.id !== currentUser.uid);

                await updateDoc(roomRef, {
                  pendingMembers: newPending,
                  pendingUids: arrayRemove(currentUser.uid)
                });
                toast.success("Solicitud cancelada");
              } catch (error) {
                console.error("Error al cancelar solicitud", error);
                toast.error("Hubo un error al cancelar la solicitud.");
              }
            }}>Cancelar Solicitud</Button>
          </div>
        </div>
      ), { duration: Infinity, style: { background: '#ffffff', color: '#111111', border: '1px solid #e5e7eb' } });
      return;
    }

    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem' }}>
        <p style={{ margin: 0, fontWeight: 500 }}>¿Estás seguro de eliminar esta sala para todos?</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button
            variant="secondary"
            style={{ padding: '0.5rem 1rem', width: 'auto' }}
            onClick={() => toast.dismiss(t.id)}
          >
            Cancelar
          </Button>
          <Button
            style={{ padding: '0.5rem 1rem', width: 'auto', backgroundColor: '#ff4d4f', color: 'white', border: 'none' }}
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await deleteDoc(doc(db, 'rooms', room.id));
                toast.success("Sala eliminada");
              } catch (error) {
                console.error("Error al eliminar", error);
                toast.error("Hubo un error al eliminar la sala.");
              }
            }}
          >
            Eliminar
          </Button>
        </div>
      </div>
    ), { duration: Infinity, style: { background: '#ffffff', color: '#111111', border: '1px solid #e5e7eb' } });
  };

  const handleShareRoom = (roomId, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
    toast.success('¡Enlace copiado! Envíalo a quienes quieras sumar a esta división.');
  };

  const handleViewUsers = async (room, e) => {
    e.stopPropagation();

    toast((t) => (
      <RoomMembersToast
        t={t}
        room={room}
        currentUser={currentUser}
      />
    ), { duration: Infinity, style: { background: '#ffffff', color: '#111111', border: '1px solid #e5e7eb', width: '100%', maxWidth: '350px' } });
  };

  return (
    <div className="app-container">
      <header className="app-header relative" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-3xl font-medium tracking-tight mb-2" style={{ margin: 0, fontSize: '1.875rem' }}>¡Hola, {currentUser?.displayName?.split(' ')[0]}!</h1>
          <p className="subtitle !mb-0 text-gray-400" style={{ margin: 0 }}>Tus salas de división activa.</p>
        </div>

        {/* Desktop Header Actions */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setIsHelpOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#888',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.25rem',
              transition: 'color 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#111'}
            onMouseOut={(e) => e.currentTarget.style.color = '#888'}
            title="¿Cómo funciona?"
          >
            <HelpCircle size={22} />
          </button>
          <img
            src={currentUser?.photoURL || `https://ui-avatars.com/api/?name=${currentUser?.displayName?.charAt(0) || 'U'}&background=random`}
            alt="Profile"
            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #e5e7eb', objectFit: 'cover' }}
            onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${currentUser?.displayName?.charAt(0) || 'U'}&background=random`; }}
          />
          <Button variant="primary" onClick={logout} style={{ padding: '0.5em 1em' }}>
            <LogOut size={16} style={{ display: 'inline', marginRight: '8px' }} /> Salir
          </Button>
        </div>

        {/* Mobile Header Menu Toggle */}
        <div className="md:hidden flex items-center gap-3">
          <img
            src={currentUser?.photoURL || `https://ui-avatars.com/api/?name=${currentUser?.displayName?.charAt(0) || 'U'}&background=random`}
            alt="Profile"
            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #e5e7eb', objectFit: 'cover' }}
            onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${currentUser?.displayName?.charAt(0) || 'U'}&background=random`; }}
          />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', display: 'flex' }}
            title="Menú"
          >
            {isMobileMenuOpen ? <X size={24} color="#111" /> : <Menu size={24} color="#111" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="absolute menu-mobile top-full right-0 mt-2 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 p-2 flex flex-col gap-1 z-50 min-w-[200px] md:hidden">
            <button
              onClick={() => { setIsHelpOpen(true); setIsMobileMenuOpen(false); }}
              className="flex items-center gap-3 w-full text-left text-sm font-medium text-gray-700 p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <HelpCircle size={18} /> ¿Cómo funciona?
            </button>
            <div className="h-px bg-gray-100 my-1"></div>
            <button
              onClick={() => { logout(); setIsMobileMenuOpen(false); }}
              className="flex items-center gap-3 w-full text-left text-sm font-medium text-red-600 p-3 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
        )}
      </header>

      <div className="dashboard-grid">

        {/* Acciones Rápidas */}
        <div className="flex-col-gap dashboard-column">
          <Card variant="dark" className="h-full p-8" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 className="text-2xl mb-2 text-white" style={{ marginBottom: '0.25rem' }}>Nueva Sala</h2>
            <p className="text-sm mb-6" style={{ marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Crea un nuevo grupo para dividir gastos desde cero.</p>
            <Button variant="white" onClick={handleCreateRoom} className="w-full text-black" style={{ marginTop: 'auto' }}>
              <Plus size={18} className="mr-2" /> Crear Sala
            </Button>
          </Card>

          <Card variant="light" className="h-full p-8" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 className="text-xl mb-2" style={{ marginBottom: '0.25rem' }}>Unirse a una Sala</h2>
            <p className="text-sm text-gray-500 mb-4" style={{ marginBottom: '1.25rem' }}>Ingresa el código que te compartieron.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: 'auto' }}>
              <input
                type="text"
                placeholder="Ej. ABC-123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="custom-input"
              />
              <Button variant="primary" onClick={handleJoinRoom} disabled={joinCode.length < 3}>
                Unirse
              </Button>
            </div>
          </Card>
        </div>

        {/* Salas Recientes */}
        <div className="dashboard-column">
          <Card variant="light" className="!min-h-[auto] p-8" style={{ height: '100%' }}>
            <h2 className="text-xl mb-6">Salas Recientes</h2>

            <div className="flex flex-col gap-4">
              {loading ? (
                <p className="text-sm text-gray-400 text-center py-4">Cargando salas...</p>
              ) : recentRooms.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No estás en ninguna sala todavía.</p>
              ) : (
                recentRooms.map(room => (
                  <div
                    key={room.id}
                    onClick={() => !room.isPendingForMe && navigate(`/room/${room.id}`)}
                    className={`room-card ${room.isPendingForMe ? 'opacity-70 cursor-default' : ''}`}
                    style={room.isPendingForMe ? { borderStyle: 'dashed' } : {}}
                  >
                    <div>
                      {room.isPendingForMe && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f59e0b', display: 'block', marginBottom: '4px' }}>[Solicitud en proceso]</span>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <h3 className="room-card-title" style={{ margin: 0 }}>{room.name ? room.name.charAt(0).toUpperCase() + room.name.slice(1) : ''}</h3>
                        {!room.isPendingForMe && (
                          <span style={
                            room.createdBy === currentUser.uid ? {
                              fontSize: '0.7rem', fontWeight: 600, borderRadius: '12px',
                              padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.5px',
                              color: '#389e0d', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f'
                            } : {
                              fontSize: '0.7rem', fontWeight: 600, borderRadius: '12px',
                              padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.5px',
                              color: '#d46b08', backgroundColor: '#fff7e6', border: '1px solid #ffd591'
                            }
                          }>
                            {room.createdBy === currentUser.uid ? 'Creador' : 'Invitado'}
                          </span>
                        )}
                      </div>
                      <span className="room-card-id" style={{ display: 'block', color: '#888' }}>
                        ID: <span style={{ color: '#f97316', fontFamily: 'monospace', marginLeft: '4px', letterSpacing: '0.5px' }}>{room.id}</span>
                      </span>
                      {room.createdAt && (
                        <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginTop: '4px' }}>
                          Creada el {new Date(room.createdAt).toLocaleDateString('es-AR')}
                        </span>
                      )}
                    </div>
                    <div className="room-card-actions" onClick={(e) => e.stopPropagation()}>
                      {!room.isPendingForMe && (
                        <>
                          <div style={{ position: 'relative' }}>
                            <Button variant="primary" style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }} onClick={(e) => handleViewUsers(room, e)} title="Ver miembros">
                              <Users size={16} />
                              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{room.members?.length || 1}</span>
                            </Button>
                            {room.createdBy === currentUser.uid && room.pendingMembers && room.pendingMembers.length > 0 && (
                              <div style={{
                                position: 'absolute',
                                top: '-5px',
                                right: '-5px',
                                backgroundColor: '#ff4d4f',
                                color: 'white',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                borderRadius: '10px',
                                padding: '2px 6px',
                                minWidth: '20px',
                                textAlign: 'center',
                                zIndex: 10,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                              }}>
                                +{room.pendingMembers.length}
                              </div>
                            )}
                          </div>
                          <Button variant="primary" style={{ padding: '0.5rem' }} onClick={(e) => handleShareRoom(room.id, e)} title="Copiar enlace">
                            <Share2 size={16} />
                          </Button>
                        </>
                      )}
                      {(room.createdBy === currentUser.uid || room.isPendingForMe) && (
                        <Button variant="primary" style={{ padding: '0.5rem' }} onClick={(e) => handleDeleteRoom(room, e)} title={room.isPendingForMe ? "Cancelar solicitud" : "Eliminar sala"}>
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

      </div>
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
};
