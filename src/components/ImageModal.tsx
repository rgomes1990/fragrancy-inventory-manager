
import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ImageModalProps {
  imageUrl: string;
  productName?: string;
  children?: React.ReactNode;
  altText?: string;
}

const ImageModal = ({ imageUrl, productName, children, altText }: ImageModalProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  if (children) {
    return (
      <>
        <div onClick={openModal}>
          {children}
        </div>
        {isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={closeModal}>
            <div className="relative max-w-4xl max-h-[90vh] p-4">
              <button
                onClick={closeModal}
                className="absolute -top-2 -right-2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={imageUrl}
                alt={altText || productName || 'Produto'}
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
              {productName && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 rounded-b-lg">
                  <h3 className="text-lg font-semibold">{productName}</h3>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export default ImageModal;
