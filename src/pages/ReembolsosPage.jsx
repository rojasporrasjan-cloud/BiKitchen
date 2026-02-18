import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import { RefreshCw, ArrowLeft, CreditCard, Timer, Truck, AlertTriangle, FileText, MessageCircle } from 'lucide-react';
import { useWhatsApp } from '../hooks/useWhatsApp';

export default function ReembolsosPage() {
  const { getWhatsAppUrl } = useWhatsApp();

  const sections = [
    {
      icon: <FileText size={22} />,
      title: '1. Alcance',
      content:
        'Esta Política de Reembolsos y Cancelaciones aplica a las compras realizadas en BiKitchen Food para nuestros productos y servicios de comida preparada y delivery en Costa Rica.'
    },
    {
      icon: <Timer size={22} />,
      title: '2. Cancelaciones y plazos',
      content:
        '• Cancelación con ≥ 24 horas antes de la entrega: reembolso completo o crédito a favor.\n' +
        '• Cancelación con 12–24 horas: reembolso del 50% o crédito del 100% para reprogramar.\n' +
        '• Cancelación con < 12 horas: no aplica reembolso (puede reprogramarse sujeto a disponibilidad).\n' +
        '• Pedidos ya en preparación o en ruta: no aplica reembolso.'
    },
    {
      icon: <Truck size={22} />,
      title: '3. Planes con múltiples entregas',
      content:
        'Para planes quincenales o mensuales, se podrá solicitar reembolso proporcional por entregas no realizadas, siempre que la solicitud se haga ≥ 24 horas antes de cada fecha programada.'
    },
    {
      icon: <CreditCard size={22} />,
      title: '4. Método de reembolso',
      content:
        '• Pagos por tarjeta (p. ej., BAC/TiloPay): reembolso al mismo medio; el plazo depende del emisor (5–10 días hábiles típicamente).\n' +
        '• SINPE/transferencia: reembolso a la misma cuenta registrada.\n' +
        '• Cupones o descuentos aplicados: se reembolsan como saldo/cupón, no en efectivo.'
    },
    {
      icon: <AlertTriangle size={22} />,
      title: '5. Incidencias en el pedido',
      content:
        'Si recibes un producto en mal estado o distinto al solicitado, notifícanos dentro de las primeras 2 horas tras la entrega con evidencia (foto/video). Ofrecemos reposición prioritaria o reembolso según el caso.'
    },
    {
      icon: <RefreshCw size={22} />,
      title: '6. Reprogramaciones y créditos',
      content:
        'Podrás reprogramar tu entrega o convertir el monto en crédito para pedidos futuros (cuando aplique y sujeto a agenda y zonas de entrega).'
    },
    {
      icon: <FileText size={22} />,
      title: '7. No reembolsables',
      content:
        'No se reembolsan: diferencias por promociones finalizadas, costos de envío ya incurridos, artículos de cortesía y saldos de cupones expirados.'
    },
    {
      icon: <MessageCircle size={22} />,
      title: '8. Cómo solicitar un reembolso',
      content:
        'Escríbenos por email a bikitchenfood@gmail.com o WhatsApp +506 8506-7200 indicando: nombre, número de pedido, fecha de entrega y motivo. Nuestro equipo te dará seguimiento en horario laboral.'
    }
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
        <Navbar />

        <section className="relative pt-32 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5"></div>
          <div className="container relative z-10">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-bikitchen-orange hover:text-bikitchen-orange-dark mb-6 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Volver al inicio</span>
            </Link>

            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                <RefreshCw size={16} />
                Política Comercial
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Política de Reembolsos y Cancelaciones
              </h1>
              <p className="text-lg text-gray-600">
                Última actualización: {new Date().toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8 md:p-12 space-y-10">
                  {sections.map((section, index) => (
                    <div key={index} className="group">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-700 flex-shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                          {section.icon}
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 pt-2">
                          {section.title}
                        </h2>
                      </div>
                      <div className="pl-16">
                        <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                          {section.content}
                        </p>
                      </div>
                      {index < sections.length - 1 && (
                        <div className="border-b border-gray-100 mt-10"></div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-8 md:p-12">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">¿Necesitas ayuda con un reembolso?</h3>
                  <p className="text-gray-600 mb-6">Contáctanos y te ayudamos con tu solicitud.</p>
                  <div className="flex flex-wrap gap-4">
                    <a
                      href="mailto:bikitchenfood@gmail.com?subject=Solicitud de reembolso"
                      className="inline-flex items-center gap-2 bg-bikitchen-orange text-white px-6 py-3 rounded-xl font-semibold hover:bg-bikitchen-orange-dark transition-colors"
                    >
                      Contactar por Email
                    </a>
                    <a
                      href={getWhatsAppUrl('Hola, necesito apoyo con un reembolso 🙏')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </PageTransition>
  );
}
