import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../../app/providers/AuthProvider";
import { getOfertas, createOferta } from "../../../lib/api/reservas";
import SuccessAnimation from "../Base/SuccessAnimation.jsx";

import EliminarBase from "../Base/EliminarBase.jsx";

export default function OfertasReservaCard({ open, onClose, reserva, onSuccess }) {
    const { user } = useAuth();
    const [ofertas, setOfertas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [actionType, setActionType] = useState(null); // 'CONTRAOFERTAR' | 'ACEPTAR' | 'RECHAZAR'
    const [successMsg, setSuccessMsg] = useState(null);
    
    // State for confirmation dialog
    const [pendingAction, setPendingAction] = useState(null); 

    // Form setup
    const { register, handleSubmit, reset, formState: { errors } } = useForm();

    useEffect(() => {
        if (open && reserva) {
            setLoading(true);
            getOfertas(reserva.id)
                .then(res => setOfertas(res.data))
                .catch(console.error)
                .finally(() => setLoading(false));
        }
        setShowForm(false);
        setSuccessMsg(null);
        setPendingAction(null);
    }, [open, reserva]);

    const handleActionClick = (action, ofertaPrev) => {
        if (action === 'ACEPTAR' || action === 'RECHAZAR') {
             // Open custom confirmation dialog instead of window.confirm
             setPendingAction({ action, oferta: ofertaPrev });
        } else {
            // Contraoferta
            setActionType('CONTRAOFERTAR');
            setShowForm(true);
            // Pre-fill monto with previous amount or empty
            reset({
                monto: ofertaPrev.monto,
                motivo: '',
                plazoHasta: ''
            });
        }
    };

    const handleConfirmAction = () => {
        if (!pendingAction) return;
        const { action, oferta } = pendingAction;
        
        submitOferta({ 
            monto: oferta.monto, 
            action: action,
            motivo: action === 'RECHAZAR' ? 'Rechazado desde panel' : undefined 
        });
        setPendingAction(null);
    };

    const submitOferta = async (data) => {
        if (!reserva) return;
        try {
            // Fix Date Offset: UTC 12:00
            let payload = { ...data, action: data.action || actionType };
            if (payload.plazoHasta) {
                // Ensure T12:00:00.000Z
                payload.plazoHasta = new Date(`${payload.plazoHasta}T12:00:00.000Z`).toISOString();
            }

            await createOferta(reserva.id, payload);
            // Refresh
            const res = await getOfertas(reserva.id);
            setOfertas(res.data);
            setShowForm(false);
            setSuccessMsg("Operación realizada con éxito");
            setTimeout(() => {
                setSuccessMsg(null);
                if (onSuccess) onSuccess(); 
            }, 1500);
        } catch (error) {
            alert(error.message || "Error al registrar oferta");
        }
    };

    const onSubmitForm = (data) => {
        submitOferta(data);
    };

    if (!open) return null;

    // Standard SuccessAnimation is overlaid, we don't return early.

    // Determine if current user can interact with the TOP offer
    // Logic: If user is ADMIN, can reply to Inmobiliaria. If user is INMO, can reply to La Federala (CCLF).
    // Also, can only reply if the offer is not explicitly ACCEPTED or REJECTED already (checking reserva state would be better but checking offer history helps too)
    // Actually, backend state controls overall status.
    // For simplicity: Show buttons on the latest offer if the responder is NOT the creator of that offer.

    const isMyRole = (role) => user?.role === role; 
    
    // Who am I?
    const iAmInmo = isMyRole('INMOBILIARIA');
    const iAmAdmin = isMyRole('ADMINISTRADOR') || isMyRole('GESTOR'); // Assume Admin/Gestor acts as CCLF

    // Check if reservation is in a final state
    const isReservaFinalized = ['ACEPTADA', 'RECHAZADA', 'CANCELADA', 'VENCIDA', 'EXPIRADA'].includes(reserva?.estado);

    const canRespond = (oferta) => {
        if (isReservaFinalized) return false;
        if (!oferta) return true; // Si no hay ofertas, se puede iniciar (e.g. Inmo hace primera oferta)
        
        const offerIsCCLF = oferta.ownerType === 'CCLF';
        if (offerIsCCLF && iAmInmo) return true;
        if (!offerIsCCLF && iAmAdmin) return true;
        return false;
    };

    return (
        <>
            <SuccessAnimation show={!!successMsg} message={successMsg} />
            
            {/* Confirmation Dialog */}
            <EliminarBase
                open={!!pendingAction}
                title={pendingAction?.action === 'ACEPTAR' ? 'Aceptar Oferta' : 'Rechazar Oferta'}
                message={pendingAction?.action === 'ACEPTAR' 
                    ? `¿Estás seguro de que deseas ACEPTAR esta oferta por ${Number(pendingAction?.oferta?.monto).toLocaleString("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}?`
                    : "¿Estás seguro de que deseas RECHAZAR esta oferta?"}
                confirmLabel={pendingAction?.action === 'ACEPTAR' ? "Aceptar Oferta" : "Rechazar Oferta"}
                onConfirm={handleConfirmAction}
                onCancel={() => setPendingAction(null)}
                variant={pendingAction?.action === 'ACEPTAR' ? 'primary' : 'danger'}
                loading={false} // submitOferta is async but we don't block the modal logic currently, we close it immediately. Could improve.
            />

            <div className="cclf-overlay" onClick={onClose}>
                <div className="cclf-card" onClick={e => e.stopPropagation()} style={{ width: '1000px', maxWidth: '95vw' }}>
                    <div className="cclf-card__header">
                        <h2 className="cclf-card__title">Historial de Ofertas - Reserva N° {reserva?.numero}</h2>
                        <button type="button" className="cclf-btn-close" onClick={onClose}>
                            <span className="cclf-btn-close__x">×</span>
                        </button>
                    </div>
                
                    <div className="cclf-card__body">
                    <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                            <colgroup>
                                <col style={{ width: '12%' }} />
                                <col style={{ width: '18%' }} />
                                <col style={{ width: '15%' }} />
                                <col style={{ width: '28%' }} /> 
                                <col style={{ width: '11%' }} />
                                <col style={{ width: '16%' }} />
                            </colgroup>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #eee', color: '#666', textAlign: 'center' }}>
                                    <th style={{ padding: 10 }}>Fecha</th>
                                    <th style={{ padding: 10 }}>Oferente</th>
                                    <th style={{ padding: 10 }}>Monto</th>
                                    <th style={{ padding: 10 }}>Motivo</th>
                                    <th style={{ padding: 10 }}>Validez</th>
                                    <th style={{ padding: 10 }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ofertas.map((o, idx) => {
                                    const isLatest = idx === 0;
                                    const showActions = isLatest && canRespond(o);

                                    return (
                                        <tr key={o.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                            <td style={{ padding: 10, textAlign: 'center' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                                            <td style={{ padding: 10, fontWeight: 'bold', textAlign: 'center' }}>{o.nombreEfector}</td>
                                            <td style={{ padding: 10, textAlign: 'center' }}>
                                              {Number(o.monto).toLocaleString("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                                            </td>
                                            <td style={{ padding: 10, textAlign: 'center', whiteSpace: 'normal', wordWrap: 'break-word' }}>{o.motivo || '-'}</td>
                                            <td style={{ padding: 10, textAlign: 'center' }}>{o.plazoHasta ? new Date(o.plazoHasta).toLocaleDateString() : '-'}</td>
                                            <td style={{ padding: 10, textAlign: 'center' }}>
                                                {showActions && !showForm && (
                                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                                        <button 
                                                            className="tl-icon tl-icon--success"
                                                            title="Aceptar"
                                                            onClick={() => handleActionClick('ACEPTAR', o)}
                                                        >
                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                        </button>
                                                        <button 
                                                            className="tl-icon tl-icon--promo"
                                                            title="Contraofertar"
                                                            onClick={() => handleActionClick('CONTRAOFERTAR', o)}
                                                        >
                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 23l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
                                                        </button>
                                                        <button 
                                                            className="tl-icon tl-icon--delete"
                                                            title="Rechazar"
                                                            onClick={() => handleActionClick('RECHAZAR', o)}
                                                        >
                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {ofertas.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#888' }}>
                                            No hay ofertas registradas. Use el botón de abajo para iniciar una negociación si corresponde.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {showForm && (
                        <div style={{ marginTop: 20, padding: 20, background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
                            <h4 style={{ margin: '0 0 15px 0', fontSize: '1rem', fontWeight: 600 }}>Nueva Contraoferta</h4>
                            <form onSubmit={handleSubmit(onSubmitForm)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div>
                                    <label className="form-label" style={{ fontWeight: 500, fontSize: '0.9rem' }}>Monto Oferta</label>
                                    <div className="input-group">
                                        <span className="input-group-text" style={{ borderRadius: '8px 0 0 8px' }}>$</span>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            className={`form-control ${errors.monto ? 'is-invalid' : ''}`} 
                                            {...register('monto', { 
                                                required: "El monto es obligatorio", 
                                                min: { value: 0.01, message: "El monto debe ser mayor a 0" }
                                            })} 
                                            style={{ borderRadius: '0 8px 8px 0' }}
                                        />
                                        {errors.monto && <div className="invalid-feedback">{errors.monto.message}</div>}
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label" style={{ fontWeight: 500, fontSize: '0.9rem' }}>Validez Hasta (Plazo)</label>
                                    <input 
                                        type="date" 
                                        className={`form-control ${errors.plazoHasta ? 'is-invalid' : ''}`}
                                        {...register('plazoHasta', {
                                            validate: value => {
                                                if (!value) return true; // Optional logic if intended, though validity usually matters. 
                                                // Assuming backend allows optional, but if entered, strictly > fechaReserva
                                                if (reserva && new Date(value) <= new Date(reserva.fechaReserva)) {
                                                    return "Debe ser posterior a la fecha de reserva";
                                                }
                                                return true;
                                            }
                                        })}
                                        style={{ borderRadius: '8px' }}
                                    />
                                    {errors.plazoHasta && <div className="invalid-feedback">{errors.plazoHasta.message}</div>}
                                    {iAmInmo && <small style={{ color: '#666', fontSize: '0.8rem', marginTop: 4, display: 'block' }}>Solo Admin puede extender la reserva oficial.</small>}
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label" style={{ fontWeight: 500, fontSize: '0.9rem' }}>Motivo / Comentario</label>
                                    <textarea 
                                        className="form-control" 
                                        {...register('motivo')} 
                                        rows={3}
                                        style={{ resize: 'none', borderRadius: '8px' }}
                                    />
                                </div>
                                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary" 
                                        onClick={() => setShowForm(false)}
                                        style={{ borderRadius: '8px', padding: '8px 16px' }}
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary"
                                        style={{ borderRadius: '8px', padding: '8px 16px', backgroundColor: '#0D3730', borderColor: '#0D3730' }}
                                    >
                                        Enviar Contraoferta
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                    
                    {/* Fallback button to start negotiation if no history exists (e.g. initial counter offer from Inmo) */}
                    {!showForm && ofertas.length === 0 && (iAmInmo || iAmAdmin) && !isReservaFinalized && (
                         <div style={{ marginTop: 20, textAlign: 'right' }}>
                             <button 
                                className="btn btn-primary" 
                                onClick={() => handleActionClick('CONTRAOFERTAR', { monto: reserva.seña || 0 })}
                                style={{ borderRadius: '8px', padding: '10px 20px', backgroundColor: '#0D3730', borderColor: '#0D3730', fontWeight: 500 }}
                             >
                                 Iniciar Negociación
                             </button>
                         </div>
                    )}
                </div>
            </div>
        </div>
        </>
    );
}
