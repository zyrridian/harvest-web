"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Star,
  Leaf,
  CheckCircle,
  ShoppingCart,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../client/api/client";
import { useCartStore } from "../../client/store/cart.store";
import { useAuthStore } from "../../client/store/auth.store";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  unit: string;
  stock_quantity: number;
  rating: number | null;
  review_count: number;
  is_organic: boolean;
  image: string | null;
  farmer?: {
    name: string;
    is_verified: boolean;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  productCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { fetchCount } = useCartStore();

  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || "",
  );
  const [isOrganic, setIsOrganic] = useState(
    searchParams.get("is_organic") === "true",
  );
  const [minPrice, setMinPrice] = useState(searchParams.get("min_price") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort_by") || "newest");
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1"),
  );

  // Queries
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await apiClient<any>("/categories");
      return Array.isArray(data) ? data : data?.categories || [];
    },
  });

  const { data: productsData, isLoading: loading } = useQuery({
    queryKey: [
      "products",
      selectedCategory,
      isOrganic,
      minPrice,
      maxPrice,
      sortBy,
      currentPage,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", "20");

      if (selectedCategory) params.set("category", selectedCategory);
      if (isOrganic) params.set("is_organic", "true");
      if (minPrice) params.set("min_price", minPrice);
      if (maxPrice) params.set("max_price", maxPrice);
      if (sortBy) params.set("sort_by", sortBy);

      const { data } = await apiClient<any>(`/products?${params.toString()}`);
      return {
        products: (data?.products || data || []) as Product[],
        pagination: (data?.pagination || null) as Pagination | null,
      };
    },
  });

  const { data: cartItemsMap = {} } = useQuery({
    queryKey: ["cartQuantities", user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data } = await apiClient<any>("/cart");
      if (data?.items) {
        const map: Record<string, number> = {};
        for (const item of data.items) {
          map[item.product?.product_id || item.productId] = item.quantity;
        }
        return map;
      }
      return {};
    },
    enabled: !!user,
  });

  const addToCartMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { data, error } = await apiClient<any>("/cart/items", {
        method: "POST",
        body: JSON.stringify({ product_id: productId, quantity: 1 }),
      });
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cartQuantities"] });
      fetchCount(); // Update the global cart count
    },
  });

  const products = productsData?.products || [];
  const pagination = productsData?.pagination;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const updateFilters = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      params.delete("page"); // Reset page when filters change
      router.push(`/products?${params.toString()}`);
    },
    [router, searchParams],
  );

  const clearFilters = () => {
    setSelectedCategory("");
    setIsOrganic(false);
    setMinPrice("");
    setMaxPrice("");
    setSortBy("newest");
    setCurrentPage(1);
    router.push("/products");
  };

  const addToCart = (productId: string) => {
    if (!user) {
      router.push(`/login?redirect=/products`);
      return;
    }
    addToCartMutation.mutate(productId);
  };

  const hasActiveFilters =
    selectedCategory ||
    isOrganic ||
    minPrice ||
    maxPrice ||
    sortBy !== "newest";

  return (
    <div className="min-h-screen pb-24 md:pb-8 bg-background">
      {/* Header */}
      <div className="border-b sticky top-0 z-10 bg-white border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-body"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-12 pr-4 py-3 text-sm border border-border rounded outline-none focus:border-accent text-heading"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 border flex items-center gap-2 text-sm font-medium transition-colors rounded hover:bg-stone-50 ${
                hasActiveFilters ? "border-accent text-accent" : "border-border text-heading"
              }`}
            >
              <Filter size={18} />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-accent" />
              )}
            </button>
          </form>

          {/* Inline Filters */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {/* Sort */}
            <div className="relative flex-shrink-0">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none px-4 py-2 pr-8 text-sm border border-border rounded outline-none bg-white text-heading cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="price">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
                <option value="popular">Most Popular</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-body"
              />
            </div>

            {/* Category chips */}
            {categories.slice(0, 6).map((category: Category) => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(
                    selectedCategory === category.slug ? "" : category.slug,
                  );
                  setCurrentPage(1);
                }}
                className={`flex-shrink-0 px-4 py-2 text-sm border transition-colors whitespace-nowrap rounded ${
                  selectedCategory === category.slug
                    ? "border-accent bg-success-bg text-accent"
                    : "border-border bg-white text-body hover:bg-stone-50"
                }`}
              >
                {category.emoji && (
                  <span className="mr-1">{category.emoji}</span>
                )}
                {category.name}
              </button>
            ))}

            {/* Organic filter */}
            <button
              onClick={() => {
                setIsOrganic(!isOrganic);
                setCurrentPage(1);
              }}
              className={`flex-shrink-0 px-4 py-2 text-sm border transition-colors whitespace-nowrap rounded ${
                isOrganic
                  ? "border-accent bg-success-bg text-accent"
                  : "border-border bg-white text-body hover:bg-stone-50"
              }`}
            >
              Organic Only
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex-shrink-0 px-4 py-2 text-sm flex items-center gap-1 hover:underline text-error"
              >
                <X size={14} />
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Expanded Filters Panel */}
        {showFilters && (
          <div className="border-t border-border px-4 py-4 bg-white">
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Category select */}
              <div>
                <label className="block text-xs font-medium mb-2 text-body">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-sm border border-border rounded outline-none bg-white text-heading"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat: Category) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price range */}
              <div>
                <label className="block text-xs font-medium mb-2 text-body">
                  Min Price
                </label>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm border border-border rounded outline-none text-heading"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2 text-body">
                  Max Price
                </label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Any"
                  className="w-full px-3 py-2 text-sm border border-border rounded outline-none text-heading"
                />
              </div>

              {/* Apply/Clear buttons */}
              <div className="flex items-end gap-2">
                <button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
                  className="flex-1 px-4 py-2 text-sm font-medium transition-colors bg-accent text-white rounded hover:bg-accent-hover"
                >
                  Apply
                </button>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm border border-border transition-colors hover:bg-stone-50 text-body rounded"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {pagination && (
          <p className="text-sm text-body">
            Showing {products.length} of {pagination.total} products
          </p>
        )}
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-accent" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Leaf size={64} className="mx-auto mb-4 text-border" />
            <h2 className="text-xl font-bold mb-2 text-heading">
              No products found
            </h2>
            <p className="mb-6 text-body">
              Try adjusting your filters or search criteria.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-2 text-sm font-medium bg-accent text-white rounded hover:bg-accent-hover"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="border border-border overflow-hidden bg-white rounded"
              >
                <Link href={`/products/${product.slug || product.id}`}>
                  <div className="aspect-square relative bg-stone-100">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Leaf size={48} className="text-border" />
                      </div>
                    )}
                    {product.is_organic && (
                      <div className="absolute top-2 right-2 px-2 py-1 text-xs font-medium bg-success-bg text-success rounded">
                        Organic
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-3">
                  <Link href={`/products/${product.slug || product.id}`}>
                    <h3 className="font-medium text-sm mb-1 truncate hover:underline text-heading">
                      {product.name}
                    </h3>
                  </Link>
                  {product.farmer && (
                    <p className="text-xs mb-2 flex items-center gap-1 text-body">
                      {product.farmer.name}
                      {product.farmer.is_verified && (
                        <CheckCircle size={12} className="text-success" />
                      )}
                    </p>
                  )}
                  {product.rating !== null && product.rating > 0 && (
                    <p className="text-xs mb-2 flex items-center gap-1 text-body">
                      <Star size={12} className="text-warning fill-warning" />
                      {product.rating?.toFixed(1)} ({product.review_count})
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-accent">
                      {product.currency}{" "}
                      {Number(product.price).toLocaleString()}
                      <span className="text-xs font-normal text-body">
                        /{product.unit}
                      </span>
                    </p>
                    <button
                      onClick={() => addToCart(product.id)}
                      disabled={addToCartMutation.isPending && addToCartMutation.variables === product.id}
                      className={`relative p-2 border transition-colors rounded disabled:opacity-50 ${
                        cartItemsMap[product.id] 
                          ? "border-accent bg-success-bg hover:bg-success-bg" 
                          : "border-border hover:bg-stone-50 hover:border-accent"
                      }`}
                      title={cartItemsMap[product.id] ? `${cartItemsMap[product.id]} in cart` : "Add to cart"}
                    >
                      {addToCartMutation.isPending && addToCartMutation.variables === product.id ? (
                        <Loader2 size={16} className="animate-spin text-accent" />
                      ) : (
                        <ShoppingCart size={16} className="text-accent" />
                      )}
                      {cartItemsMap[product.id] > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center text-[9px] font-bold text-white bg-accent rounded-full">
                          {cartItemsMap[product.id] > 9 ? "9+" : cartItemsMap[product.id]}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-center gap-2 py-8">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-border rounded transition-colors hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} className="text-heading" />
            </button>

            {Array.from(
              { length: Math.min(5, pagination.total_pages) },
              (_, i) => {
                let pageNum;
                if (pagination.total_pages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= pagination.total_pages - 2) {
                  pageNum = pagination.total_pages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 text-sm font-medium border rounded transition-colors ${
                      currentPage === pageNum
                        ? "border-accent bg-accent text-white"
                        : "border-border bg-white text-heading hover:bg-stone-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              },
            )}

            <button
              onClick={() =>
                setCurrentPage(
                  Math.min(pagination.total_pages, currentPage + 1),
                )
              }
              disabled={currentPage === pagination.total_pages}
              className="p-2 border border-border rounded transition-colors hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} className="text-heading" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 size={32} className="animate-spin text-accent" />
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
