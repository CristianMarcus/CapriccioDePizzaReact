// src/components/OrderFormModal.jsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { X, Send, CreditCard, ArrowLeft } from 'lucide-react';

const OrderFormModal = ({ cartItems, onClose, onBack, onSendOrder }) => {
  // Estado para los datos del cliente
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  // Estado para el método de pago seleccionado
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' o 'mercadopago'
  // Estado para el monto con el que abona (solo para efectivo)
  const [cashAmount, setCashAmount] = useState('');
  // Estado para errores de validación
  const [errors, setErrors] = useState({});

  // Calcula el total del pedido y lo redondea hacia abajo a un número entero
  const total = useMemo(() => {
    return Math.floor(cartItems.reduce((sum, item) => sum + item.precio * item.quantity, 0));
  }, [cartItems]);

  // Valida un campo específico y actualiza el estado de errores
  // MOVIDO ARRIBA para que esté disponible antes que useEffect
  const validateField = useCallback((fieldName, value) => {
    console.log(`OrderFormModal: Validando campo '${fieldName}' con valor '${value}'`); // **DEBUG**
    let errorMessage = '';
    switch (fieldName) {
      case 'name':
        if (!value.trim()) errorMessage = 'El nombre es obligatorio.';
        break;
      case 'address':
        if (!value.trim()) errorMessage = 'La dirección es obligatoria.';
        break;
      case 'phone':
        if (!value.trim()) {
          errorMessage = 'El teléfono es obligatorio.';
        } else if (!/^\d+$/.test(value.trim())) {
          errorMessage = 'El teléfono debe contener solo números.';
        }
        break;
      case 'cashAmount':
        if (paymentMethod === 'cash') { // Solo valida si el método de pago es efectivo
            const parsedCashAmount = parseFloat(value);
            // La validación compara con el total ya redondeado (entero)
            if (isNaN(parsedCashAmount) || parsedCashAmount < total) {
                errorMessage = `El monto debe ser igual o mayor al total del pedido ($${total}).`;
            }
        }
        break;
      default:
        break;
    }
    setErrors(prevErrors => {
      const updatedErrors = {
        ...prevErrors,
        [fieldName]: errorMessage,
      };
      console.log(`OrderFormModal: Errores actualizados para '${fieldName}':`, updatedErrors); // **DEBUG**
      return updatedErrors;
    });
  }, [total, paymentMethod]); // Añadir paymentMethod como dependencia para que validateField reaccione a su cambio

  // Manejador genérico para cambios en los campos del formulario
  // MOVIDO ARRIBA ya que depende de validateField
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    if (name === 'name') setName(value);
    else if (name === 'address') setAddress(value);
    else if (name === 'phone') setPhone(value);
    else if (name === 'cashAmount') {
      setCashAmount(value);
    }
    
    validateField(name, value);
  }, [validateField]);


  // UseEffect para limpiar errores de `cashAmount` si el método de pago cambia a Mercado Pago
  // AHORA validateField SÍ ESTÁ DEFINIDO CUANDO ESTE useEffect SE EJECUTA
  useEffect(() => {
    if (paymentMethod === 'mercadopago') {
      setErrors(prevErrors => {
        const newErrors = { ...prevErrors };
        delete newErrors.cashAmount; // Elimina el error de cashAmount si cambia a MP
        return newErrors;
      });
      setCashAmount(''); // Limpiar el monto en efectivo si se cambia a MP
    } else {
        // Cuando cambia a efectivo, revalidar el campo cashAmount
        validateField('cashAmount', cashAmount);
    }
  }, [paymentMethod, cashAmount, validateField]); 


  // `useMemo` para determinar si el monto en efectivo es insuficiente
  const isCashAmountInsufficient = useMemo(() => {
    if (paymentMethod === 'cash') {
      const parsedCashAmount = parseFloat(cashAmount);
      const isInsufficient = isNaN(parsedCashAmount) || parsedCashAmount < total;
      console.log(`OrderFormModal: isCashAmountInsufficient (paymentMethod=${paymentMethod}, cashAmount=${cashAmount}, total=${total}):`, isInsufficient); // **DEBUG**
      return isInsufficient;
    }
    console.log(`OrderFormModal: isCashAmountInsufficient: false (no efectivo)`); // **DEBUG**
    return false; // No es relevante si no es pago en efectivo
  }, [paymentMethod, cashAmount, total]);

  // `useMemo` para determinar si todo el formulario es válido para el botón de envío
  const isFormValid = useMemo(() => {
    const baseFieldsValid = name.trim() && address.trim() && phone.trim() && 
                            !errors.name && !errors.address && !errors.phone;
    
    let valid = baseFieldsValid;

    if (paymentMethod === 'cash') {
      valid = valid && !isCashAmountInsufficient; 
    }
    
    console.log(`OrderFormModal: isFormValid calculado: ${valid}. Detalles: {name: ${name.trim()?'true':'false'}, address: ${address.trim()?'true':'false'}, phone: ${phone.trim()?'true':'false'}, errors: ${JSON.stringify(errors)}, paymentMethod: ${paymentMethod}, isCashAmountInsufficient: ${isCashAmountInsufficient}}`); // **DEBUG**
    return valid; 
  }, [name, address, phone, paymentMethod, isCashAmountInsufficient, errors]); 


  // Manejador del envío del formulario
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    console.log("OrderFormModal: handleSubmit (FINAL) llamado."); // **DEBUG CRÍTICO**
    console.log("OrderFormModal: isFormValid en handleSubmit:", isFormValid); // **DEBUG**

    // Re-validar todo el formulario justo antes de enviar para una última comprobación
    const currentErrors = {};
    if (!name.trim()) currentErrors.name = 'El nombre es obligatorio.';
    if (!address.trim()) currentErrors.address = 'La dirección es obligatoria.';
    if (!phone.trim()) {
        currentErrors.phone = 'El teléfono es obligatorio.';
    } else if (!/^\d+$/.test(phone.trim())) {
        currentErrors.phone = 'El teléfono debe contener solo números.';
    }
    
    if (paymentMethod === 'cash') {
      const parsedCashAmount = parseFloat(cashAmount);
      if (isNaN(parsedCashAmount) || parsedCashAmount < total) {
        currentErrors.cashAmount = `El monto debe ser igual o mayor al total del pedido ($${total}).`;
      }
    }
    setErrors(currentErrors); // Actualiza los errores para que se muestren al usuario

    if (Object.keys(currentErrors).length === 0) {
      console.log("OrderFormModal: Formulario validado correctamente. Llamando a onSendOrder."); // **DEBUG CRÍTICO**
      const finalCashAmount = paymentMethod === 'cash' ? (parseFloat(cashAmount) || 0) : 0;
      onSendOrder({ name, address, phone, paymentMethod, cashAmount: finalCashAmount });
    } else {
      console.log("OrderFormModal: Formulario no válido. Errores finales:", currentErrors); // **DEBUG**
      alert('Por favor, corrige los errores en el formulario antes de enviar el pedido.'); 
    }
  }, [name, address, phone, paymentMethod, cashAmount, total, onSendOrder, isFormValid]); 

  // Calcula el vuelto, redondeado a un número entero
  const change = paymentMethod === 'cash' && !isCashAmountInsufficient
    ? Math.floor(parseFloat(cashAmount) - total) 
    : 0; 

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto transform scale-95 animate-scale-in">
        <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <CreditCard size={28} className="text-blue-600" /> Confirmar Pedido
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
            aria-label="Cerrar formulario de pedido"
          >
            <X size={28} />
          </button>
        </div>

        <div className="mb-6 text-center">
          <p className="text-3xl font-extrabold text-red-600 dark:text-red-400">
            Total a pagar: ${total} 
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5"> 
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={name}
              onChange={handleInputChange}
              onBlur={() => validateField('name', name)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${
                errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              }`}
              placeholder="Ej: Juan Pérez"
              required
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Dirección de Entrega <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={address}
              onChange={handleInputChange}
              onBlur={() => validateField('address', address)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${
                errors.address ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              }`}
              placeholder="Ej: Calle Falsa 123, Depto 4A"
              required
            />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Teléfono (WhatsApp) <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={phone}
              onChange={handleInputChange}
              onBlur={() => validateField('phone', phone)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${
                errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              }`}
              placeholder="Ej: 1123456789 (solo números)"
              required
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
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
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')}
                  className="form-radio text-red-600 h-5 w-5"
                />
                <span className="text-gray-900 dark:text-gray-100 font-medium">Efectivo</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex-grow">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="mercadopago"
                  checked={paymentMethod === 'mercadopago'}
                  onChange={() => setPaymentMethod('mercadopago')}
                  className="form-radio text-red-600 h-5 w-5"
                />
                <span className="text-gray-900 dark:text-gray-100 font-medium">Mercado Pago</span>
              </label>
            </div>
          </div>

          {/* Campos condicionales según el método de pago */}
          {paymentMethod === 'cash' && (
            <div className="mb-6">
              <label htmlFor="cashAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ¿Con cuánto abonas? <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="cashAmount"
                name="cashAmount"
                value={cashAmount}
                onChange={handleInputChange}
                onBlur={() => validateField('cashAmount', cashAmount)}
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${
                  errors.cashAmount ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                }`}
                placeholder={`Monto ($${total} o más)`} 
                min={total} 
                step="1" 
                required={paymentMethod === 'cash'}
              />
              {errors.cashAmount && <p className="text-red-500 text-xs mt-1">{errors.cashAmount}</p>}
              {!isCashAmountInsufficient && parseFloat(cashAmount) > 0 && parseFloat(cashAmount) >= total && (
                <p className="text-green-600 dark:text-green-400 text-sm mt-2">
                  Vuelto: ${change} 
                </p>
              )}
            </div>
          )}

          {paymentMethod === 'mercadopago' && (
            <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-2">Instrucciones para Mercado Pago:</p>
              <p className="text-sm">Por favor, realiza la transferencia por el monto total de ${total}.</p> 
              <p className="text-sm mt-1">Una vez finalizado el pedido, envíanos el comprobante por WhatsApp.</p>
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
              disabled={!isFormValid}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enviar Pedido <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderFormModal;
