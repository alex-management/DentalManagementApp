import React, { Fragment, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Comanda, Pacient, Produs } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tehnicianName: string | null;
  orders: Comanda[];
  pacienti: Pacient[];
  produse: Produs[];
  onOpenComanda?: (comanda: Comanda) => void;
}

const TehnicianOrdersModal: React.FC<Props> = ({ isOpen, onClose, tehnicianName, orders, pacienti, produse, onOpenComanda }) => {
  // Aggregate products across all the technician's completed orders in the
  // selected period, summing quantities per product.
  const productSummary = useMemo(() => {
    const totals = new Map<number, number>();
    for (const o of orders) {
      for (const p of o.produse) {
        totals.set(p.id_produs, (totals.get(p.id_produs) || 0) + (Number(p.cantitate) || 0));
      }
    }
    return Array.from(totals.entries())
      .map(([id_produs, cantitate]) => ({
        id_produs,
        cantitate,
        nume: produse.find(pr => pr.id === id_produs)?.nume || `#${id_produs}`,
      }))
      .sort((a, b) => a.nume.localeCompare(b.nume, 'ro'));
  }, [orders, produse]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="flex max-h-[85vh] w-full max-w-3xl transform flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-50">
                  {`Comenzi finalizate — ${tehnicianName || ''}`}
                </Dialog.Title>

                {productSummary.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Produse din comenzile finalizate</h4>
                    <div className="flex flex-wrap gap-2">
                      {productSummary.map(p => (
                        <span
                          key={p.id_produs}
                          className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm text-sky-800 dark:border-sky-800 dark:bg-sky-900/40 dark:text-sky-200"
                        >
                          <span>{p.nume}</span>
                          <span className="font-bold">× {p.cantitate}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex-1 overflow-y-auto">
                  {orders.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nicio comanda finalizată pentru acest tehnician.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                          <tr>
                            <th className="px-4 py-2">ID</th>
                            <th className="px-4 py-2">Pacient</th>
                            <th className="px-4 py-2">Data finalizare</th>
                            <th className="px-4 py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map(o => {
                            // Resolve pacient name by id directly from the patients table
                            // (pacienti), so it works even for patients not attached to a doctor.
                            const pacient = pacienti.find(p => p.id === o.id_pacient);
                            const pacientName = pacient ? pacient.nume : `#${o.id_pacient}`;
                            return (
                              <tr key={o.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{o.id}</td>
                                <td className="px-4 py-2">{pacientName}</td>
                                <td className="px-4 py-2">{o.data_finalizare ? format(new Date(o.data_finalizare), 'dd LLL yyyy') : '-'}</td>
                                <td className="px-4 py-2 text-right font-semibold">{formatCurrency(o.total)}</td>
                                <td className="px-4 py-2 text-right">
                                  {onOpenComanda && <Button size="sm" variant="outline" onClick={() => onOpenComanda(o)}>Deschide comanda</Button>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex shrink-0 justify-end">
                  <Button variant="secondary" onClick={onClose}>Închide</Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default TehnicianOrdersModal;
