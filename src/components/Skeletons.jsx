/**
 * Skeleton Loaders para BiKitchen
 * Mejoran la percepción de velocidad de carga
 */

// Clase base de animación
const shimmer = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent";

/**
 * Skeleton base con animación shimmer
 */
export function Skeleton({ className = "", rounded = "rounded-lg" }) {
    return (
        <div className={`bg-gray-200 ${rounded} ${shimmer} ${className}`} />
    );
}

/**
 * Skeleton para tarjeta de producto
 */
export function ProductCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            {/* Imagen */}
            <Skeleton className="w-full h-48" rounded="rounded-none" />
            
            {/* Contenido */}
            <div className="p-4 space-y-3">
                {/* Categoría */}
                <Skeleton className="h-4 w-20" />
                
                {/* Título */}
                <Skeleton className="h-5 w-3/4" />
                
                {/* Descripción */}
                <div className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                </div>
                
                {/* Precio y botón */}
                <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-10 w-24" rounded="rounded-xl" />
                </div>
            </div>
        </div>
    );
}

/**
 * Skeleton para tarjeta de pack
 */
export function PackCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
                <Skeleton className="w-16 h-16" rounded="rounded-xl" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            </div>
            
            {/* Features */}
            <div className="space-y-2 mb-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-2">
                        <Skeleton className="w-4 h-4" rounded="rounded-full" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                ))}
            </div>
            
            {/* Precio */}
            <div className="flex items-center justify-between pt-4 border-t">
                <div className="space-y-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-8 w-24" />
                </div>
                <Skeleton className="h-12 w-32" rounded="rounded-xl" />
            </div>
        </div>
    );
}

/**
 * Skeleton para item del carrito
 */
export function CartItemSkeleton() {
    return (
        <div className="flex items-center gap-4 p-4 border-b">
            <Skeleton className="w-16 h-16 flex-shrink-0" rounded="rounded-xl" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20" />
        </div>
    );
}

/**
 * Skeleton para tabla de pedidos
 */
export function OrderRowSkeleton() {
    return (
        <div className="flex items-center gap-4 p-4 border-b">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-20" rounded="rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
        </div>
    );
}

/**
 * Skeleton para estadísticas del dashboard
 */
export function StatCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="w-12 h-12" rounded="rounded-xl" />
                <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
        </div>
    );
}

/**
 * Skeleton para perfil de usuario
 */
export function ProfileSkeleton() {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
                <Skeleton className="w-20 h-20" rounded="rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10" rounded="rounded-xl" />
                        <div className="flex-1 space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-40" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Skeleton para lista de reseñas
 */
export function ReviewSkeleton() {
    return (
        <div className="border-b pb-4">
            <div className="flex items-center gap-3 mb-2">
                <Skeleton className="w-10 h-10" rounded="rounded-full" />
                <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-20" />
                </div>
            </div>
            <div className="space-y-2 ml-13">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
            </div>
        </div>
    );
}

/**
 * Skeleton para menú/categorías
 */
export function CategoryTabsSkeleton() {
    return (
        <div className="flex gap-2 overflow-x-auto pb-2">
            {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-10 w-28 flex-shrink-0" rounded="rounded-full" />
            ))}
        </div>
    );
}

/**
 * Skeleton para hero/banner
 */
export function HeroSkeleton() {
    return (
        <div className="relative h-[60vh] min-h-[400px]">
            <Skeleton className="absolute inset-0" rounded="rounded-none" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4 px-4">
                    <Skeleton className="h-12 w-64 mx-auto" />
                    <Skeleton className="h-6 w-80 mx-auto" />
                    <Skeleton className="h-12 w-40 mx-auto" rounded="rounded-full" />
                </div>
            </div>
        </div>
    );
}

/**
 * Grid de productos con skeletons
 */
export function ProductGridSkeleton({ count = 6 }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <ProductCardSkeleton key={i} />
            ))}
        </div>
    );
}

/**
 * Grid de packs con skeletons
 */
export function PackGridSkeleton({ count = 3 }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <PackCardSkeleton key={i} />
            ))}
        </div>
    );
}

/**
 * Lista de pedidos con skeletons
 */
export function OrdersListSkeleton({ count = 5 }) {
    return (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {Array.from({ length: count }).map((_, i) => (
                <OrderRowSkeleton key={i} />
            ))}
        </div>
    );
}

/**
 * Dashboard stats skeleton
 */
export function DashboardStatsSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
                <StatCardSkeleton key={i} />
            ))}
        </div>
    );
}

/**
 * Texto skeleton con líneas
 */
export function TextSkeleton({ lines = 3 }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton 
                    key={i} 
                    className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} 
                />
            ))}
        </div>
    );
}

/**
 * Imagen skeleton con aspect ratio
 */
export function ImageSkeleton({ aspectRatio = "aspect-video" }) {
    return (
        <div className={`${aspectRatio} w-full`}>
            <Skeleton className="w-full h-full" />
        </div>
    );
}

export default {
    Skeleton,
    ProductCardSkeleton,
    PackCardSkeleton,
    CartItemSkeleton,
    OrderRowSkeleton,
    StatCardSkeleton,
    ProfileSkeleton,
    ReviewSkeleton,
    CategoryTabsSkeleton,
    HeroSkeleton,
    ProductGridSkeleton,
    PackGridSkeleton,
    OrdersListSkeleton,
    DashboardStatsSkeleton,
    TextSkeleton,
    ImageSkeleton
};
