import { IOrderRepository } from "../../domain/repositories/order.repository";
import { BUSINESS } from "@/core/config/constants";
import { AppError } from "@/core/errors";
import { buildPaginationMeta } from "@/core/helpers/pagination";
import { snap } from "@/core/services/midtrans";
export class GetOrdersUseCase {
    constructor(private readonly orderRepo: IOrderRepository) { }
    async execute(userId: string, role: string, status: string | null, page: number, limit: number, skip: number): Promise<any> {
        const where: Record<string, unknown> = role === "seller" ? { sellerId: userId } : { buyerId: userId };
        if (status) {
            where.status = status;
        }
        const [orders, totalItems] = await Promise.all([
            this.orderRepo.findOrders(where, skip, limit),
            this.orderRepo.countOrders(where),
        ]);
        const formattedOrders = orders.map((order) => ({
            order_id: order.id,
            order_number: order.orderNumber,
            status: order.status,
            seller: {
                user_id: order.seller.id,
                name: order.seller.name,
                profile_picture: order.seller.avatarUrl,
            },
            items: order.items.map((item: any) => ({
                product_id: item.productId,
                product_name: item.productName,
                quantity: item.quantity,
                unit: item.product.unit,
                image: item.productImage,
            })),
            item_count: order.items.length,
            total_quantity: order.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
            total_amount: order.totalAmount,
            currency: BUSINESS.CURRENCY,
            delivery: {
                method: order.deliveryMethod,
                date: order.deliveryDate,
                tracking_number: order.trackingNumber,
            },
            created_at: order.createdAt,
        }));
        return {
            orders: formattedOrders,
            pagination: buildPaginationMeta(page, limit, totalItems),
        };
    }
}
export class CreateOrderUseCase {
    constructor(private readonly orderRepo: IOrderRepository) { }
    async execute(userId: string, input: any): Promise<any> {
        const {
            cart_item_ids,
            payment_method,
            delivery_fee,
        } = input;
        const clientDeliveryFee = typeof delivery_fee === "number" ? delivery_fee : null;
        const payload = { ...input, clientDeliveryFee };
        const user = await this.orderRepo.getUser(userId);
        if (!user) throw AppError.notFound("User not found");
        const isWholesale = user.isWholesale;
        const orderLimit = isWholesale ? user.wholesaleLimit || 9999 : 50;
        const cartItems = await this.orderRepo.getCartItemsForOrder(userId, cart_item_ids);
        if (cartItems.length === 0) {
            throw AppError.notFound("No valid cart items found");
        }
        const itemsBySeller: Record<string, typeof cartItems> = {};
        cartItems.forEach((item) => {
            const sellerId = item.product.sellerId;
            if (!itemsBySeller[sellerId]) {
                itemsBySeller[sellerId] = [];
            }
            itemsBySeller[sellerId].push(item);
        });
        const createdOrders = await this.orderRepo.createOrdersInTransaction(
            userId,
            itemsBySeller,
            payload,
            orderLimit
        );
        const isCOD = payment_method === "cod";
        const totalAmount = createdOrders.reduce((sum, order) => sum + order.total_amount, 0);
        let snapToken: string | null = null;
        let paymentUrl: string | null = null;
        if (!isCOD) {
            try {
                const orderIds = createdOrders.map((o) => o.order_id).join(",");
                const snapParameter = {
                    transaction_details: {
                        order_id: `HARVEST-${createdOrders[0].order_number}-${Date.now()}`,
                        gross_amount: Math.round(totalAmount),
                    },
                    customer_details: {
                        first_name: user.name || "Customer",
                        email: user.email || undefined,
                    },
                    item_details: createdOrders.map((o) => ({
                        id: o.order_id,
                        price: Math.round(o.total_amount),
                        quantity: 1,
                        name: `Order ${o.order_number}`,
                    })),
                    callbacks: {
                        finish: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout/success?orders=${orderIds}&total=${totalAmount}&method=${payment_method}`,
                        error: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout?error=payment_failed`,
                        pending: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout/success?orders=${orderIds}&total=${totalAmount}&method=${payment_method}&pending=1`,
                    },
                    enabled_payments:
                        payment_method === "bank_transfer"
                            ? ["bca_va", "bni_va", "bri_va", "permata_va", "mandiri_bill", "other_va"]
                            : payment_method === "e_wallet"
                                ? ["gopay", "shopeepay", "dana", "ovo", "qris"]
                                : payment_method === "credit_card"
                                    ? ["credit_card"]
                                    : undefined,
                };
                const snapResponse = await snap.createTransaction(snapParameter);
                snapToken = snapResponse.token;
                paymentUrl = snapResponse.redirect_url;
                for (const o of createdOrders) {
                    await this.orderRepo.updateTrackingNumber(o.order_id, snapParameter.transaction_details.order_id);
                }
            } catch (err: any) {
                console.error("Midtrans token generation failed:", err);
            }
        }
        return {
            orders: createdOrders,
            snap_token: snapToken,
            payment_url: paymentUrl,
            payment_summary: {
                total_orders: createdOrders.length,
                grand_total: totalAmount,
                payment_method,
                payment_instructions: isCOD
                    ? {
                        message: "Please prepare the exact amount to pay the farmer upon delivery.",
                        amount: totalAmount,
                    }
                    : snapToken
                        ? {
                            message: "Complete your payment via Midtrans.",
                            amount: totalAmount,
                        }
                        : {
                            bank_name: "Bank Mandiri",
                            account_number: "1234567890",
                            account_name: "Farm Market",
                            amount: totalAmount,
                            valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000),
                        },
            },
        };
    }
}
export class GetOrderByIdUseCase {
    constructor(private readonly orderRepo: IOrderRepository) { }
    async execute(userId: string, orderId: string): Promise<any> {
        const order = await this.orderRepo.findOrderById(orderId);
        if (!order) throw AppError.notFound("Order not found");
        if (order.buyerId !== userId && order.sellerId !== userId) {
            throw AppError.forbidden("Unauthorized");
        }
        const timeline = [
            { status: "pending_payment", timestamp: order.createdAt },
        ];
        if (order.paidAt) {
            timeline.push({ status: "paid", timestamp: order.paidAt });
        }
        if (order.cancelledAt) {
            timeline.push({ status: "cancelled", timestamp: order.cancelledAt });
        }
        return {
            order_id: order.id,
            order_number: order.orderNumber,
            status: order.status,
            seller: {
                user_id: order.seller.id,
                name: order.seller.name,
                profile_picture: order.seller.avatarUrl,
            },
            items: order.items.map((item: any) => ({
                order_item_id: item.id,
                product: {
                    product_id: item.productId,
                    name: item.productName,
                    image: item.productImage,
                },
                quantity: item.quantity,
                unit_price: item.unitPrice,
                discount: item.discount,
                subtotal: item.subtotal,
            })),
            delivery: order.deliveryAddress
                ? {
                    method: order.deliveryMethod,
                    address: {
                        address_id: order.deliveryAddress.id,
                        full_address: order.deliveryAddress.fullAddress,
                        recipient_name: order.deliveryAddress.recipientName,
                        phone: order.deliveryAddress.phone,
                    },
                    date: order.deliveryDate,
                    time_slot: order.deliveryTimeSlot,
                    fee: order.deliveryFee,
                    tracking_number: order.trackingNumber,
                    estimated_arrival: order.estimatedArrival,
                }
                : null,
            pricing: {
                subtotal: order.subtotal,
                delivery_fee: order.deliveryFee,
                service_fee: order.serviceFee,
                total_discount: order.totalDiscount,
                total: order.totalAmount,
            },
            payment: {
                method: order.paymentMethod,
                status: order.paymentStatus,
                paid_at: order.paidAt,
            },
            timeline,
            notes: order.notes,
            cancelled_reason: order.cancelledReason,
            created_at: order.createdAt,
            updated_at: order.updatedAt,
        };
    }
}
export class CancelOrderUseCase {
    constructor(private readonly orderRepo: IOrderRepository) { }
    async execute(userId: string, orderId: string, reason: string, details?: string): Promise<any> {
        const order = await this.orderRepo.findOrderById(orderId);
        if (!order) throw AppError.notFound("Order not found");
        if (order.buyerId !== userId && order.sellerId !== userId) {
            throw AppError.forbidden("Unauthorized");
        }
        if (["cancelled", "delivered", "refunded"].includes(order.status)) {
            throw AppError.badRequest("Order cannot be cancelled");
        }
        const cancelledOrder = await this.orderRepo.updateOrder(orderId, {
            status: "cancelled",
            cancelledReason: `${reason}${details ? `: ${details}` : ""}`,
            cancelledAt: new Date(),
        });
        return {
            order_id: cancelledOrder.id,
            status: cancelledOrder.status,
            refund: order.paidAt
                ? {
                    amount: order.totalAmount,
                    method: order.paymentMethod,
                    estimated_days: 7,
                }
                : null,
        };
    }
}
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const FUZZY_THRESHOLD_KM = 2;
function fuzzLocation(lat: number, lng: number, orderId: string): { lat: number; lng: number } {
    const seed = orderId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const offsetLat = ((seed % 100) / 100 - 0.5) * 0.008;
    const offsetLng = (((seed * 7) % 100) / 100 - 0.5) * 0.008;
    return { lat: lat + offsetLat, lng: lng + offsetLng };
}
export class GetOrderTrackingUseCase {
    constructor(private readonly orderRepo: IOrderRepository) { }
    async execute(userId: string, orderId: string): Promise<any> {
        const order = await this.orderRepo.findOrderWithTracking(orderId, userId);
        if (!order) throw AppError.notFound("Order not found");
        if (!order.routeStop) {
            return {
                order_id: order.id,
                delivery_method: order.deliveryMethod,
                tracking_available: false,
                reason: "Delivery not yet scheduled by farmer",
            };
        }
        const route = order.routeStop.route;
        if (!route.trackingEnabled) {
            return {
                order_id: order.id,
                tracking_available: false,
                route_status: route.status,
                stop_status: order.routeStop.status,
                estimated_arrival: order.routeStop.estimatedArrival,
                reason: "Farmer has not enabled live tracking for this delivery",
            };
        }
        if (!route.currentLat || !route.currentLng) {
            return {
                order_id: order.id,
                tracking_available: true,
                route_status: route.status,
                stop_status: order.routeStop.status,
                estimated_arrival: order.routeStop.estimatedArrival,
                live_location: null,
                reason: "Waiting for farmer to start moving",
            };
        }
        const buyerLat = order.deliveryAddress?.latitude;
        const buyerLng = order.deliveryAddress?.longitude;
        let liveLocation: {
            lat: number;
            lng: number;
            is_exact: boolean;
            updated_at: Date | null;
        };
        if (buyerLat && buyerLng) {
            const distKm = haversineKm(route.currentLat, route.currentLng, buyerLat, buyerLng);
            const isExact = distKm <= FUZZY_THRESHOLD_KM;
            if (isExact) {
                liveLocation = {
                    lat: route.currentLat,
                    lng: route.currentLng,
                    is_exact: true,
                    updated_at: route.locationUpdatedAt,
                };
            } else {
                const fuzzy = fuzzLocation(route.currentLat, route.currentLng, order.id);
                liveLocation = {
                    lat: fuzzy.lat,
                    lng: fuzzy.lng,
                    is_exact: false,
                    updated_at: route.locationUpdatedAt,
                };
            }
        } else {
            const fuzzy = fuzzLocation(route.currentLat, route.currentLng, order.id);
            liveLocation = {
                lat: fuzzy.lat,
                lng: fuzzy.lng,
                is_exact: false,
                updated_at: route.locationUpdatedAt,
            };
        }
        const stopsAhead = await this.orderRepo.getStopAheadCount(route.id, order.routeStop.stopOrder);
        return {
            order_id: order.id,
            tracking_available: true,
            route_status: route.status,
            stop_status: order.routeStop.status,
            stop_order: order.routeStop.stopOrder,
            stops_ahead: stopsAhead,
            estimated_arrival: order.routeStop.estimatedArrival,
            actual_arrival: order.routeStop.actualArrival,
            live_location: liveLocation,
        };
    }
}
