/**
 * Estados de pedido — fuente única de verdad.
 *
 * Las etiquetas viven duplicadas en OrdersView.jsx y DeliveryView.jsx desde antes;
 * los archivos nuevos deben importar de aquí, y esos dos conviene migrarlos cuando
 * se toquen por otro motivo (no vale la pena editarlos solo por esto).
 */

export const ORDER_STATUS_LABELS = {
    pending_payment: '💳 Pago Pendiente',
    payment_failed: '❌ Pago Fallido',
    pending: 'Pendiente',
    confirmed: '✅ Confirmado',
    in_transit: 'En Ruta',
    delivered: 'Entregado',
    cancelled: 'Cancelado'
};

/**
 * Estados en los que el pago todavía NO está confirmado, o sea los únicos que
 * el importador puede aprobar. Coincide con el botón "Confirmar Pago" de OrdersView.
 */
export const CONFIRMABLE_STATUSES = ['pending_payment', 'pending', 'payment_failed'];

export const getOrderStatusLabel = (status) => ORDER_STATUS_LABELS[status] || 'Desconocido';
