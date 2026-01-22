import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Button } from '../ui/Button';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmInvoiceModal: React.FC<ConfirmInvoiceModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm
}) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 flex justify-between items-center">
                  <span>Confirmă Facturarea</span>
                  <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <X size={20} />
                  </button>
                </Dialog.Title>
                <div className="mt-4 flex items-start space-x-4">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 sm:mx-0 sm:h-10 sm:w-10">
                        <AlertTriangle className="h-6 w-6 text-orange-600" aria-hidden="true" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 pt-2">
                        Ești sigur că vrei să marchezi această comandă ca fiind facturată? După facturare, comanda nu va mai putea fi modificată în niciun fel, doar vizualizată.
                    </p>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <Button variant="secondary" onClick={onClose}>
                    Anulează
                  </Button>
                  <Button variant="default" onClick={onConfirm}>
                    Da, Factureaza
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ConfirmInvoiceModal;
