import React, { useState, useEffect, useCallback } from 'react';
import { XCircle, Image as ImageIcon, Loader } from 'lucide-react'; // Importa el icono Loader

const ProductForm = ({ product, onClose, onSave, showNotification }) => {
  const [formData, setFormData] = useState({
    name: '',
    descripcion: '', // Cambiado de 'description' a 'descripcion'
    precio: '',      // Cambiado de 'price' a 'precio'
    category: '',
    image: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        descripcion: product.descripcion || '', // Accediendo a product.descripcion
        precio: product.precio || '',            // Accediendo a product.precio
        category: product.category || '',
        image: product.image || '',
      });
      setImagePreview(product.image || '');
    } else {
      setFormData({
        name: '',
        descripcion: '',
        precio: '',
        category: '',
        image: '',
      });
      setImagePreview('');
    }
    setImageFile(null);
  }, [product]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      showNotification('Imagen seleccionada: ' + file.name, 'info');
    } else {
      setImageFile(null);
      setImagePreview(formData.image || '');
      showNotification('No se seleccionó ninguna imagen.', 'info');
    }
  }, [formData.image, showNotification]);

  const uploadImageToCloudinary = useCallback(async (file) => {
    setIsUploadingImage(true);

    // =========================================================================
    // !!! IMPORTANTE: REEMPLAZA ESTOS VALORES CON LOS DE TU CUENTA DE CLOUDINARY !!!
    // =========================================================================
    const CLOUDINARY_CLOUD_NAME = 'asadofer'; // <<< Reemplaza con tu Cloud Name de Cloudinary
    const CLOUDINARY_UPLOAD_PRESET = 'mi_app_capriccio'; // <<< Reemplaza con tu Upload Preset de Cloudinary (debe ser 'Unsigned')
    // =========================================================================

    const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    if (CLOUDINARY_CLOUD_NAME.includes("YOUR_CLOUD_NAME") || CLOUDINARY_UPLOAD_PRESET.includes("tu_upload_preset")) {
      showNotification('Error de configuración: Cloudinary Cloud Name o Upload Preset no configurado. Por favor, edita ProductForm.jsx', 'error', 7000);
      setIsUploadingImage(false);
      throw new Error("Cloudinary configuration missing or invalid.");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      showNotification('Subiendo imagen a Cloudinary...', 'info', 0); // Notificación persistente
      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // Si la respuesta no es OK (ej. 4xx, 5xx), intentar leer texto para depurar
        const errorText = await response.text();
        console.error("Error respuesta NO-OK de Cloudinary (texto):", errorText);
        let errorMessage = `Error al subir imagen: ${response.status} ${response.statusText}.`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = `Error al subir imagen: ${errorData.error ? errorData.error.message : errorText}`;
        } catch (jsonParseError) {
          // Si no es JSON, el errorText ya es el mensaje más útil
          errorMessage = `Error al subir imagen: ${response.statusText}. Respuesta no JSON: ${errorText.substring(0, 200)}...`;
        }
        throw new Error(errorMessage);
      }

      // Intentar leer la respuesta como JSON
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // Si falla la lectura JSON, leer como texto para depurar
        const responseText = await response.text();
        console.error("Error al parsear JSON de Cloudinary. Respuesta cruda:", responseText);
        throw new Error(`Error al procesar la respuesta de Cloudinary (no JSON): ${responseText.substring(0, 200)}...`);
      }
      
      showNotification('Imagen subida con éxito a Cloudinary.', 'success');
      console.log("Cloudinary response:", data);
      return data.secure_url;
    } catch (error) {
      console.error('Error durante la subida de imagen:', error);
      showNotification(`Error al subir imagen: ${error.message}`, 'error', 7000);
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  }, [showNotification]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setFormLoading(true);

    let imageUrl = formData.image;

    if (imageFile) {
      const uploadedUrl = await uploadImageToCloudinary(imageFile);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      } else {
        setFormLoading(false);
        // showNotification ya se maneja dentro de uploadImageToCloudinary en caso de error
        return;
      }
    }

    const productToSave = {
      ...formData,
      // Asegurarse de que el precio se guarda como número
      precio: parseFloat(formData.precio), // Asegúrate de usar formData.precio
      image: imageUrl,
    };

    if (!productToSave.name || productToSave.precio <= 0 || !productToSave.category) { // Usar productToSave.precio
      showNotification('Por favor, completa todos los campos requeridos (Nombre, Precio > 0, Categoría).', 'error');
      setFormLoading(false);
      return;
    }

    if (isNaN(productToSave.precio)) { // Usar productToSave.precio
      showNotification('El precio debe ser un número válido.', 'error');
      setFormLoading(false);
      return;
    }

    try {
      await onSave(product ? product.id : null, productToSave);
      onClose();
    } catch (saveError) {
      console.error("Error al guardar producto en el formulario:", saveError);
      // La notificación de error de Firestore ya se maneja en AdminDashboard
    } finally {
      setFormLoading(false);
    }
  }, [formData, imageFile, product, onSave, onClose, showNotification, uploadImageToCloudinary]);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg transform transition-all duration-300 scale-100 opacity-100">
        <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700 mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {product ? 'Editar Producto' : 'Añadir Nuevo Producto'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            disabled={formLoading || isUploadingImage}
          >
            <XCircle size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre del Producto:
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
              disabled={formLoading || isUploadingImage}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripción:
            </label>
            <textarea
              id="descripcion" // Cambiado de 'description' a 'descripcion'
              name="descripcion" // Cambiado de 'description' a 'descripcion'
              value={formData.descripcion} // Usando formData.descripcion
              onChange={handleChange}
              rows="3"
              className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              disabled={formLoading || isUploadingImage}
            ></textarea>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="precio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Precio:
              </label>
              <input
                type="number"
                id="precio" // Cambiado de 'price' a 'precio'
                name="precio" // Cambiado de 'price' a 'precio'
                value={formData.precio} // Usando formData.precio
                onChange={handleChange}
                step="0.01"
                className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
                disabled={formLoading || isUploadingImage}
              />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categoría:
              </label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
                disabled={formLoading || isUploadingImage}
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="imageFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Imagen del Producto:
            </label>
            <input
              type="file"
              id="imageFile"
              accept="image/*"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-gray-900 dark:text-gray-100
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-violet-50 file:text-red-700
                hover:file:bg-violet-100 cursor-pointer"
              disabled={formLoading || isUploadingImage}
            />
            {imagePreview && (
              <div className="mt-4 flex items-center space-x-3">
                <img
                  src={imagePreview}
                  alt="Vista previa"
                  className="w-24 h-24 object-cover rounded-md border border-gray-200 dark:border-gray-700"
                />
                {isUploadingImage && (
                  <div className="flex items-center text-blue-500 dark:text-blue-400">
                    <Loader size={20} className="animate-spin mr-2" /> Subiendo...
                  </div>
                )}
              </div>
            )}
            {!imagePreview && formData.image && (
                <div className="mt-4 flex items-center text-gray-500 dark:text-gray-400">
                    <ImageIcon size={20} className="mr-2" /> Sin vista previa de archivo seleccionado, usando imagen existente.
                </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-md shadow-sm transition-all duration-200"
              disabled={formLoading || isUploadingImage}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={formLoading || isUploadingImage}
            >
              {(formLoading || isUploadingImage) && <Loader size={20} className="animate-spin mr-2" />}
              {product ? 'Guardar Cambios' : 'Añadir Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
