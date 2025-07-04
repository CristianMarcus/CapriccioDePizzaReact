import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { XCircle, ArrowLeft, Send, Loader2, Home, Truck, Clock, Calendar } from 'lucide-react'; // Importamos nuevos iconos

function OrderFormModal({ cartItems, onClose, onBack, onSendOrder, showNotification }) {
  // Estado unificado para todos los datos del formulario
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    paymentMethod: 'cash', // 'cash' o 'mercadopago'
    cashAmount: '',
    deliveryMethod: 'pickup', // 'pickup' (Retiro en local) o 'delivery' (Delivery a domicilio)
    orderType: 'immediate', // 'immediate' o 'reserved'
    orderTime: '', // Para la hora de reserva o se llenará automáticamente si es inmediato
    notes: '', // Campo para notas adicionales del cliente
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mercadopagoConfirmed, setMercadopagoConfirmed] = useState(false);

  const firstInputRef = useRef(null);

  // Focus en el primer input al abrir el modal
  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, []);

  // Calcula el total del pedido y lo redondea hacia abajo a un número entero
  const total = useMemo(() => {
    return Math.floor(cartItems.reduce((sum, item) => sum + item.precio * item.quantity, 0));
  }, [cartItems]);

  // Valida un campo específico
  const validateField = useCallback((name, value) => {
    let error = '';
    switch (name) {
      case 'name':
        if (!value.trim()) error = 'El nombre es requerido.';
        break;
      case 'address':
        // La dirección solo es requerida si el método de envío es 'delivery'
        if (formData.deliveryMethod === 'delivery' && !value.trim()) {
          error = 'La dirección es requerida para el delivery.';
        }
        break;
      case 'phone':
        if (!value.trim()) {
          error = 'El teléfono es requerido.';
        } else if (!/^\d+$/.test(value)) {
          error = 'El teléfono solo debe contener números.';
        } else if (value.length < 8) {
          error = 'El teléfono debe tener al menos 8 dígitos.';
        }
        break;
      case 'cashAmount':
        if (formData.paymentMethod === 'cash') {
          const amount = parseFloat(value);
          if (isNaN(amount) || amount <= 0) {
            error = 'El monto no es válido o debe ser mayor a cero.';
          } else if (amount < total) {
            error = `El monto debe ser igual o mayor al total del pedido ($${total}).`;
          }
        }
        break;
      case 'orderTime':
        // Validar orderTime solo si orderType es 'reserved'
        if (formData.orderType === 'reserved') {
          if (!value.trim()) {
            error = 'La fecha y hora de reserva son requeridas.';
          } else {
            const selectedDateTime = new Date(value);
            const now = new Date();
            // Asegurarse de que la reserva sea en el futuro (con un pequeño margen de 1 minuto)
            if (selectedDateTime <= new Date(now.getTime() + 60 * 1000)) { // +1 minuto para evitar problemas de segundos
              error = 'La fecha y hora de reserva deben ser en el futuro.';
            }
          }
        }
        break;
      default:
        break;
    }
    return error;
  }, [formData.paymentMethod, formData.deliveryMethod, formData.orderType, total]);

  // Manejador genérico para cambios en los inputs
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Validar el campo inmediatamente
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, [validateField]);

  // Manejador para el cambio del método de pago
  const handlePaymentMethodChange = useCallback((e) => {
    const newMethod = e.target.value;
    setFormData((prev) => ({
      ...prev,
      paymentMethod: newMethod,
      cashAmount: newMethod === 'cash' ? prev.cashAmount : '', // Limpiar cashAmount si no es efectivo
    }));
    setErrors((prev) => { // Limpiar errores de cashAmount si cambia el método de pago
      const newErrors = { ...prev };
      delete newErrors.cashAmount;
      return newErrors;
    });
    if (newMethod !== 'mercadopago') {
      setMercadopagoConfirmed(false);
    }
  }, []);

  // Manejador para el cambio del método de envío
  const handleDeliveryMethodChange = useCallback((e) => {
    const newMethod = e.target.value;
    setFormData((prev) => ({
      ...prev,
      deliveryMethod: newMethod,
      address: newMethod === 'pickup' ? '' : prev.address, // Limpiar dirección si es retiro en local
    }));
    setErrors((prev) => { // Limpiar error de dirección si cambia a pickup
      const newErrors = { ...prev };
      if (newMethod === 'pickup') {
        delete newErrors.address;
      } else { // Si cambia a delivery, revalidar dirección
        newErrors.address = validateField('address', formData.address);
      }
      return newErrors;
    });
  }, [formData.address, validateField]);

  // Manejador para el cambio del tipo de pedido (inmediato/reservado)
  const handleOrderTypeChange = useCallback((e) => {
    const newOrderType = e.target.value;
    setFormData((prev) => ({
      ...prev,
      orderType: newOrderType,
      orderTime: newOrderType === 'immediate' ? '' : prev.orderTime, // Limpiar orderTime si es inmediato
    }));
    setErrors((prev) => { // Limpiar error de orderTime si cambia a inmediato
      const newErrors = { ...prev };
      if (newOrderType === 'immediate') {
        delete newErrors.orderTime;
      } else { // Si cambia a reservado, revalidar orderTime
        newErrors.orderTime = validateField('orderTime', formData.orderTime);
      }
      return newErrors;
    });
  }, [formData.orderTime, validateField]);

  // Manejador para la confirmación de Mercado Pago
  const handleMercadopagoConfirmChange = useCallback((e) => {
    setMercadopagoConfirmed(e.target.checked);
    setErrors((prev) => { // Limpiar error de confirmación MP
      const newErrors = { ...prev };
      if (e.target.checked) {
        delete newErrors.mercadopagoConfirmation;
      }
      return newErrors;
    });
  }, []);

  // `useMemo` para determinar si todo el formulario es válido para el botón de envío
  const isFormValid = useMemo(() => {
    // Validar campos base
    const areCoreFieldsFilled = formData.name.trim() !== '' &&
                                 formData.phone.trim() !== '';

    // Validar dirección condicionalmente
    const isAddressValid = formData.deliveryMethod === 'delivery'
                             ? formData.address.trim() !== '' && !errors.address
                             : true; // No se requiere dirección para 'pickup'

    // Validar método de pago
    let paymentMethodValid = true;
    if (formData.paymentMethod === 'cash') {
      const amount = parseFloat(formData.cashAmount);
      const isCurrentCashAmountInsufficient = isNaN(amount) || amount < total;
      paymentMethodValid = !isCurrentCashAmountInsufficient && !errors.cashAmount;
    } else if (formData.paymentMethod === 'mercadopago') {
      paymentMethodValid = mercadopagoConfirmed;
    }

    // Validar tipo de pedido y hora condicionalmente
    let orderTimeValid = true;
    if (formData.orderType === 'reserved') {
      orderTimeValid = formData.orderTime.trim() !== '' && !errors.orderTime;
    }

    // Comprobar que no haya errores en el objeto 'errors' que no hayan sido manejados explícitamente
    const hasAnyInputErrors = Object.keys(errors).some(key =>
      errors[key] !== '' &&
      key !== 'cashAmount' && // Estos ya se manejan en paymentMethodValid
      key !== 'mercadopagoConfirmation' && // Este ya se maneja en paymentMethodValid
      key !== 'address' && // Este ya se maneja en isAddressValid
      key !== 'orderTime' // Este ya se maneja en orderTimeValid
    );

    return areCoreFieldsFilled && isAddressValid && paymentMethodValid && orderTimeValid && !hasAnyInputErrors;
  }, [formData, mercadopagoConfirmed, errors, total]); // Añadir 'total' como dependencia aquí

  // Manejador del envío del formulario
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Re-validar todos los campos para asegurar que se muestren los errores
    const newErrorsOnSubmit = {};
    Object.keys(formData).forEach((name) => {
      // Evitar validar campos condicionales si no son relevantes
      if (name === 'cashAmount' && formData.paymentMethod !== 'cash') return;
      if (name === 'address' && formData.deliveryMethod === 'pickup') return;
      if (name === 'orderTime' && formData.orderType !== 'reserved') return;
      if (name === 'notes') return; // No validar notas

      const error = validateField(name, formData[name]);
      if (error) {
        newErrorsOnSubmit[name] = error;
      }
    });

    // Validaciones específicas de pago que pueden no ser cubiertas por validateField genérico
    if (formData.paymentMethod === 'cash') {
      const amount = parseFloat(formData.cashAmount);
      if (isNaN(amount) || amount <= 0) {
        newErrorsOnSubmit.cashAmount = 'El monto no es válido o debe ser mayor a cero.';
      } else if (amount < total) {
        newErrorsOnSubmit.cashAmount = `El monto debe ser igual o mayor al total del pedido ($${total}).`;
      }
    } else if (formData.paymentMethod === 'mercadopago' && !mercadopagoConfirmed) {
      newErrorsOnSubmit.mercadopagoConfirmation = 'Debes confirmar que enviarás el comprobante.';
    }

    setErrors(newErrorsOnSubmit);

    const finalFormIsValid = Object.keys(newErrorsOnSubmit).length === 0;

    if (finalFormIsValid) {
      try {
        // Determinar el orderTime final: si es inmediato, usa la hora actual
        const finalOrderTime = formData.orderType === 'immediate' ? new Date().toISOString() : formData.orderTime;

        await onSendOrder({ ...formData, orderTime: finalOrderTime });
      } catch (submitError) {
        console.error("Error al enviar el pedido:", submitError);
        showNotification("Hubo un error al enviar tu pedido. Intenta de nuevo.", "error");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      showNotification("Por favor, corrige los errores del formulario para continuar.", "error", 5000);
      setIsSubmitting(false);
    }
  }, [formData, total, mercadopagoConfirmed, onSendOrder, showNotification, validateField]);

  // Calcula el vuelto, redondeado a un número entero
  const change = useMemo(() => {
    const parsedCashAmount = parseFloat(formData.cashAmount);
    // Verificar si el monto en efectivo es válido y suficiente antes de calcular el vuelto
    if (formData.paymentMethod === 'cash' && !isNaN(parsedCashAmount) && parsedCashAmount >= total) {
      return Math.floor(parsedCashAmount - total);
    }
    return 0;
  }, [formData.paymentMethod, formData.cashAmount, total]);

  // Determinar si el monto en efectivo es insuficiente para mostrar el mensaje de error o el vuelto
  const isCashAmountInsufficient = useMemo(() => {
    if (formData.paymentMethod === 'cash') {
      const parsedCashAmount = parseFloat(formData.cashAmount);
      return isNaN(parsedCashAmount) || parsedCashAmount < total;
    }
    return false;
  }, [formData.paymentMethod, formData.cashAmount, total]);


  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-xl sm:max-w-2xl max-h-[90vh] overflow-y-auto transform scale-95 animate-scale-in">
        {/* Encabezado del modal */}
        <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Send size={32} className="text-blue-600" /> Confirmar Pedido
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
            aria-label="Cerrar formulario de pedido"
          >
            <XCircle size={28} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campo Nombre */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre Completo</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              ref={firstInputRef}
              className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Ej: Juan Pérez"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && <p id="name-error" className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Campo Teléfono */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Teléfono</label>
            <input
              type="tel"
              inputMode="numeric"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Ej: 1123456789"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'phone-error' : undefined}
            />
            {errors.phone && <p id="phone-error" className="mt-1 text-sm text-red-600">{errors.phone}</p>}
          </div>

          {/* Método de Envío */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Método de Envío</label>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <label className="inline-flex items-center cursor-pointer bg-gray-100 dark:bg-gray-700 p-3 rounded-lg shadow-sm flex-1">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="pickup"
                  checked={formData.deliveryMethod === 'pickup'}
                  onChange={handleDeliveryMethodChange}
                  className="form-radio text-emerald-600 h-5 w-5"
                  aria-label="Retirar en el local"
                />
                <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium flex items-center">
                  <Home size={20} className="mr-1 text-emerald-600"/> Retiro en el local (Av. Monteverde N° 1181, Quilmes)
                </span>
              </label>
              <label className="inline-flex items-center cursor-pointer bg-gray-100 dark:bg-gray-700 p-3 rounded-lg shadow-sm flex-1">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="delivery"
                  checked={formData.deliveryMethod === 'delivery'}
                  onChange={handleDeliveryMethodChange}
                  className="form-radio text-red-600 h-5 w-5"
                  aria-label="Delivery a domicilio sin cargo"
                />
                <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium flex items-center">
                  <Truck size={20} className="mr-1 text-red-600"/> Delivery a domicilio (sin cargo)
                </span>
              </label>
            </div>
          </div>

          {/* Campo Dirección (Condicional: solo si es delivery) */}
          {formData.deliveryMethod === 'delivery' && (
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dirección de Envío</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Ej: Calle Falsa 123, Depto 4A"
                aria-invalid={!!errors.address}
                aria-describedby={errors.address ? 'address-error' : undefined}
                required // La dirección es requerida solo para delivery
              />
              {errors.address && <p id="address-error" className="mt-1 text-sm text-red-600">{errors.address}</p>}
            </div>
          )}

          {/* Tipo de Pedido (Inmediato / Reserva) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">¿Cuándo quieres tu pedido?</label>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <label className="inline-flex items-center cursor-pointer bg-gray-100 dark:bg-gray-700 p-3 rounded-lg shadow-sm flex-1">
                <input
                  type="radio"
                  name="orderType"
                  value="immediate"
                  checked={formData.orderType === 'immediate'}
                  onChange={handleOrderTypeChange}
                  className="form-radio text-blue-600 h-5 w-5"
                  aria-label="Pedido Inmediato"
                />
                <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium flex items-center">
                  <Clock size={20} className="mr-1 text-blue-600"/> Inmediato
                </span>
              </label>
              <label className="inline-flex items-center cursor-pointer bg-gray-100 dark:bg-gray-700 p-3 rounded-lg shadow-sm flex-1">
                <input
                  type="radio"
                  name="orderType"
                  value="reserved"
                  checked={formData.orderType === 'reserved'}
                  onChange={handleOrderTypeChange}
                  className="form-radio text-purple-600 h-5 w-5"
                  aria-label="Pedido con Reserva"
                />
                <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium flex items-center">
                  <Calendar size={20} className="mr-1 text-purple-600"/> Reservar para otro momento
                </span>
              </label>
            </div>
          </div>

          {/* Campo Fecha y Hora de Reserva (Condicional: solo si es reserva) */}
          {formData.orderType === 'reserved' && (
            <div>
              <label htmlFor="orderTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fecha y Hora de Reserva</label>
              <input
                type="datetime-local"
                id="orderTime"
                name="orderTime"
                value={formData.orderTime}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 ${errors.orderTime ? 'border-red-500' : 'border-gray-300'}`}
                aria-invalid={!!errors.orderTime}
                aria-describedby={errors.orderTime ? 'orderTime-error' : undefined}
                required
              />
              {errors.orderTime && <p id="orderTime-error" className="mt-1 text-sm text-red-600">{errors.orderTime}</p>}
            </div>
          )}

          {/* Campo para Notas Adicionales */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notas Adicionales (Opcional)</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 border-gray-300"
              placeholder="Ej: Sin cebolla, extra picante, etc."
            ></textarea>
          </div>

          {/* Mostrar el Total del Pedido */}
          <div className="flex justify-between items-center text-xl font-bold text-gray-900 dark:text-gray-100 py-3 border-t border-b border-gray-200 dark:border-gray-700 my-4">
            <span>Total a Pagar:</span>
            <span className="text-red-600 dark:text-red-400 text-2xl">${total}</span>
          </div>

          {/* Sección de Método de Pago */}
          <div className="mb-6">
            <p className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-3">
              Método de Pago:
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex-grow">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  checked={formData.paymentMethod === 'cash'}
                  onChange={handlePaymentMethodChange}
                  className="form-radio text-red-600 h-5 w-5"
                  aria-label="Pagar en efectivo"
                />
                <span className="text-gray-900 dark:text-gray-100 font-medium">Efectivo</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex-grow">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="mercadopago"
                  checked={formData.paymentMethod === 'mercadopago'}
                  onChange={handlePaymentMethodChange}
                  className="form-radio text-red-600 h-5 w-5"
                  aria-label="Pagar con Mercado Pago"
                />
                <span className="text-gray-900 dark:text-gray-100 font-medium">Mercado Pago</span>
              </label>
            </div>
          </div>

          {/* Campos condicionales según el método de pago */}
          {formData.paymentMethod === 'cash' && (
            <div className="mb-6">
              <label htmlFor="cashAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ¿Con cuánto abonas? <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="cashAmount"
                name="cashAmount"
                value={formData.cashAmount}
                onChange={handleChange}
                onBlur={() => setErrors(prev => ({ ...prev, cashAmount: validateField('cashAmount', formData.cashAmount) }))} // Revalidar al salir
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${
                  errors.cashAmount ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                }`}
                placeholder={`Monto ($${total} o más)`}
                min={total}
                step="1"
                required={formData.paymentMethod === 'cash'}
              />
              {errors.cashAmount && <p className="text-red-500 text-xs mt-1">{errors.cashAmount}</p>}
              {!isCashAmountInsufficient && parseFloat(formData.cashAmount) > 0 && parseFloat(formData.cashAmount) >= total && (
                <p className="text-green-600 dark:text-green-400 text-sm mt-2">
                  Vuelto: ${change}
                </p>
              )}
            </div>
          )}

          {formData.paymentMethod === 'mercadopago' && (
            <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200 text-sm shadow-inner">
              <p className="font-semibold mb-2">Instrucciones para Mercado Pago:</p>
              <p className="text-sm">Por favor solicita el alias y realiza la transferencia por el monto total de ${total}.</p>
              <p className="text-sm mt-1">Una vez finalizado el pedido, envíanos el comprobante por WhatsApp.</p>

              <label className="inline-flex items-center cursor-pointer mt-3">
                <input
                  type="checkbox"
                  checked={mercadopagoConfirmed}
                  onChange={handleMercadopagoConfirmChange}
                  className={`form-checkbox h-5 w-5 text-green-600 rounded ${errors.mercadopagoConfirmation ? 'border-red-500' : 'border-gray-300'}`}
                  aria-invalid={!!errors.mercadopagoConfirmation}
                  aria-describedby={errors.mercadopagoConfirmation ? 'mercadopago-confirm-error' : undefined}
                />
                <span className="ml-2 text-gray-900 dark:text-gray-100">
                  He leído y entiendo que debo enviar el comprobante de pago.
                </span>
              </label>
              {errors.mercadopagoConfirmation && <p id="mercadopago-confirm-error" className="mt-1 text-sm text-red-600">{errors.mercadopagoConfirmation}</p>}
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold py-3 px-6 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300 flex items-center justify-center gap-2"
            >
              <ArrowLeft size={20} /> Volver al Resumen
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 size={20} className="animate-spin mr-2" />
              ) : (
                <Send size={20} />
              )}
              {isSubmitting ? 'Enviando...' : 'Enviar Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OrderFormModal;
