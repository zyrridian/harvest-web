import { NextRequest } from "next/server";
import prisma from "@/core/database/prisma";
import { AppError, handleRouteError } from "@/core/errors";
import { successResponse } from "@/core/helpers/response";

/**
 * @swagger
 * /api/v1/catalog/products/{id}:
 *   get:
 *     summary: Get detailed information about a specific product
 *     tags: [Catalog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Try to find product by slug first, then by id
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: id }, { slug: id }],
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        subcategory: {
          select: { id: true, name: true, slug: true },
        },
        seller: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            userType: true,
            isOnline: true,
          },
        },
        images: { orderBy: { displayOrder: "asc" } },
        videos: true,
        specifications: { orderBy: { displayOrder: "asc" } },
        tags: true,
        certifications: true,
        discounts: {
          where: {
            isActive: true,
            validFrom: { lte: new Date() },
            validUntil: { gte: new Date() },
          },
          take: 1,
          orderBy: { value: "desc" },
        },
      },
    });

    if (!product) {
      throw AppError.notFound("Product not found");
    }

    // Get seller profile and farmer info in parallel
    const [sellerProfile, farmerInfo] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId: product.sellerId },
      }),
      prisma.farmer.findUnique({
        where: { userId: product.sellerId },
      }),
    ]);

    const activeDiscount = product.discounts[0];

    return successResponse({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      long_description: product.longDescription,
      category: product.category
        ? {
            category_id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
          }
        : null,
      subcategory: product.subcategory
        ? {
            subcategory_id: product.subcategory.id,
            name: product.subcategory.name,
            slug: product.subcategory.slug,
          }
        : null,
      price: product.price,
      currency: product.currency,
      unit: product.unit,
      discount: activeDiscount
        ? {
            discount_id: activeDiscount.id,
            type: activeDiscount.type,
            value: activeDiscount.value,
            discounted_price: activeDiscount.discountedPrice,
            savings:
              activeDiscount.type === "percentage"
                ? product.price * (activeDiscount.value / 100)
                : activeDiscount.value,
            valid_from: activeDiscount.validFrom,
            valid_until: activeDiscount.validUntil,
            reason: activeDiscount.reason,
          }
        : null,
      stock_quantity: product.stockQuantity,
      minimum_order: product.minimumOrder,
      maximum_order: product.maximumOrder,
      unit_weight: product.unitWeight,
      images: product.images.map((img) => ({
        image_id: img.id,
        url: img.url,
        thumbnail_url: img.thumbnailUrl,
        medium_url: img.mediumUrl,
        alt_text: img.altText,
        is_primary: img.isPrimary,
        order: img.displayOrder,
      })),
      videos: product.videos.map((vid) => ({
        video_id: vid.id,
        url: vid.url,
        thumbnail_url: vid.thumbnailUrl,
        duration: vid.duration,
        title: vid.title,
      })),
      seller: {
        seller_id: product.seller.id,
        user_id: product.seller.id,
        name: product.seller.name,
        avatar_url: product.seller.avatarUrl,
        profile_picture: product.seller.avatarUrl,
        rating: farmerInfo?.rating || 0,
        reviews_count: farmerInfo?.totalReviews || 0,
        verified: farmerInfo?.isVerified || false,
        verification_badge: farmerInfo?.verificationBadge,
        location: farmerInfo
          ? {
              city: farmerInfo.city,
              state: farmerInfo.state,
              latitude: farmerInfo.latitude,
              longitude: farmerInfo.longitude,
            }
          : null,
        response_rate: sellerProfile?.responseRate || 0,
        response_time: sellerProfile?.responseTime,
        total_products: farmerInfo?.totalProducts || 0,
        joined_since: sellerProfile?.joinedSince,
        joined_date: farmerInfo?.joinedDate,
        followers_count: farmerInfo?.followersCount || 0,
      },
      farmer: farmerInfo
        ? {
            farmer_id: farmerInfo.id,
            name: farmerInfo.name,
            farm_name: farmerInfo.name,
            city: farmerInfo.city,
            is_verified: farmerInfo.isVerified,
            rating: farmerInfo.rating,
            total_products: farmerInfo.totalProducts,
          }
        : null,
      specifications: product.specifications.map((spec) => ({
        key: spec.specKey,
        value: spec.specValue,
      })),
      certifications: product.certifications.map((cert) => ({
        certification_id: cert.id,
        name: cert.name,
        issuer: cert.issuer,
        certificate_number: cert.certificateNumber,
        issue_date: cert.issueDate,
        expiry_date: cert.expiryDate,
        verified: cert.verified,
        badge_url: cert.badgeUrl,
      })),
      rating: product.rating,
      review_count: product.reviewCount,
      attributes: {
        is_organic: product.isOrganic,
        is_local: false,
        is_seasonal: false,
        harvest_date: product.harvestDate,
        expiry_date: null,
        origin: null,
        storage_instructions: null,
        nutritional_info: null,
      },
      is_organic: product.isOrganic,
      is_harvest: product.isHarvest,
      target_amount: product.targetAmount,
      current_booked: product.currentBooked,
      is_available: product.isAvailable,
      harvest_date: product.harvestDate,
      tags: product.tags.map((t) => t.tag),
      view_count: product.viewCount,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    });
  } catch (error) {
    return handleRouteError(error, "Fetch product");
  }
}
