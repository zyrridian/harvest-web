"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  X,
  Image as ImageIcon,
  AlertCircle,
  Check,
} from "lucide-react";

// Design System Colors
const colors = {
  background: "#FAFAF9",
  white: "#FFFFFF",
  heading: "#18181b",
  body: "#475569",
  accent: "#166534",
  accentHover: "#14532d",
  border: "#E4E4E7",
  success: "#16a34a",
  successBg: "#dcfce7",
  error: "#dc2626",
  errorBg: "#fee2e2",
};

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<{value: string, label: string}[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    long_description: "",
    category_id: "",
    price: "",
    unit: "kg",
    stock: "",
    minimum_order: "1",
    maximum_order: "999",
    is_organic: false,
    is_harvest: false,
    target_amount: "",
    harvest_date: "",
    images: [] as { url: string; is_primary: boolean }[],
    tags: [] as string[],
    specifications: [] as { key: string; value: string }[],
  });

  const [newTag, setNewTag] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");

  useEffect(() => {
    fetchCategories();
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const response = await fetch("/api/v1/units");
      const data = await response.json();
      if (response.ok) {
        setUnits(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch units:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/v1/categories");
      const data = await response.json();
      if (response.ok) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    setFormData((prev) => ({
      ...prev,
      images: [
        ...prev.images,
        { url: newImageUrl.trim(), is_primary: prev.images.length === 0 },
      ],
    }));
    setNewImageUrl("");
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => {
      const newImages = prev.images.filter((_, i) => i !== index);
      // If removed image was primary, make first image primary
      if (prev.images[index].is_primary && newImages.length > 0) {
        newImages[0].is_primary = true;
      }
      return { ...prev, images: newImages };
    });
  };

  const handleSetPrimaryImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.map((img, i) => ({
        ...img,
        is_primary: i === index,
      })),
    }));
  };

  const handleAddTag = () => {
    if (!newTag.trim() || formData.tags.includes(newTag.trim())) return;
    setFormData((prev) => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
    setNewTag("");
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleAddSpecification = () => {
    if (!newSpecKey.trim() || !newSpecValue.trim()) return;
    setFormData((prev) => ({
      ...prev,
      specifications: [
        ...prev.specifications,
        { key: newSpecKey.trim(), value: newSpecValue.trim() },
      ],
    }));
    setNewSpecKey("");
    setNewSpecValue("");
  };

  const handleRemoveSpecification = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/v1/farmer/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock) || 0,
          minimum_order: parseInt(formData.minimum_order),
          maximum_order: parseInt(formData.maximum_order),
          harvest_date: formData.harvest_date || null,
          category_id: formData.category_id || null,
          is_harvest: formData.is_harvest,
          target_amount: formData.is_harvest ? parseFloat(formData.target_amount) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create product");
      }

      setSuccess("Product created successfully!");
      setTimeout(() => {
        router.push("/farmer/products");
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/farmer/products"
          className="p-2 hover:bg-gray-100 rounded transition-colors"
        >
          <ArrowLeft size={20} style={{ color: colors.body }} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.heading }}>
            Add New Product
          </h1>
          <p className="text-sm" style={{ color: colors.body }}>
            Fill in the details to add a new product
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div
          className="p-4 border flex items-center gap-3"
          style={{
            backgroundColor: colors.successBg,
            borderColor: colors.success,
            borderRadius: "4px",
          }}
        >
          <Check size={20} style={{ color: colors.success }} />
          <p style={{ color: colors.accent }}>{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          className="p-4 border flex items-center gap-3"
          style={{
            backgroundColor: colors.errorBg,
            borderColor: colors.error,
            borderRadius: "4px",
          }}
        >
          <AlertCircle size={20} style={{ color: colors.error }} />
          <p style={{ color: colors.error }}>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div
          className="p-6 border"
          style={{
            backgroundColor: colors.white,
            borderColor: colors.border,
            borderRadius: "4px",
          }}
        >
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: colors.heading }}
          >
            Basic Information
          </h2>

          <div className="grid gap-4">
            {/* Product Name */}
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: colors.heading }}
              >
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Fresh Organic Tomatoes"
                className="w-full px-4 py-3 border outline-none transition-colors focus:border-green-700"
                style={{
                  borderColor: colors.border,
                  borderRadius: "4px",
                  color: colors.heading,
                }}
              />
            </div>

            {/* Category */}
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: colors.heading }}
              >
                Category
              </label>
              <select
                value={formData.category_id}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    category_id: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 border outline-none transition-colors focus:border-green-700"
                style={{
                  borderColor: colors.border,
                  borderRadius: "4px",
                  color: colors.heading,
                }}
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: colors.heading }}
              >
                Short Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Brief description of your product"
                rows={3}
                className="w-full px-4 py-3 border outline-none transition-colors focus:border-green-700 resize-none"
                style={{
                  borderColor: colors.border,
                  borderRadius: "4px",
                  color: colors.heading,
                }}
              />
            </div>

            {/* Long Description */}
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: colors.heading }}
              >
                Detailed Description
              </label>
              <textarea
                value={formData.long_description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    long_description: e.target.value,
                  }))
                }
                placeholder="Detailed information about your product, growing methods, etc."
                rows={5}
                className="w-full px-4 py-3 border outline-none transition-colors focus:border-green-700 resize-none"
                style={{
                  borderColor: colors.border,
                  borderRadius: "4px",
                  color: colors.heading,
                }}
              />
            </div>
          </div>
        </div>

        {/* Pricing & Inventory */}
        <div
          className="p-6 border"
          style={{
            backgroundColor: colors.white,
            borderColor: colors.border,
            borderRadius: "4px",
          }}
        >
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: colors.heading }}
          >
            Pricing & Inventory
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Price */}
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: colors.heading }}
              >
                Price (IDR) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="100"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, price: e.target.value }))
                }
                placeholder="25000"
                className="w-full px-4 py-3 border outline-none transition-colors focus:border-green-700"
                style={{
                  borderColor: colors.border,
                  borderRadius: "4px",
                  color: colors.heading,
                }}
              />
            </div>

            {/* Unit */}
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: colors.heading }}
              >
                Unit *
              </label>
              <select
                required
                value={formData.unit}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, unit: e.target.value }))
                }
                className="w-full px-4 py-3 border outline-none transition-colors focus:border-green-700"
                style={{
                  borderColor: colors.border,
                  borderRadius: "4px",
                  color: colors.heading,
                }}
              >
                {units.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock */}
            {!formData.is_harvest && (
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: colors.heading }}
                >
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, stock: e.target.value }))
                  }
                  placeholder="100"
                  className="w-full px-4 py-3 border outline-none transition-colors focus:border-green-700"
                  style={{
                    borderColor: colors.border,
                    borderRadius: "4px",
                    color: colors.heading,
                  }}
                />
              </div>
            )}

            {/* Harvest Date */}
            {formData.is_harvest && (
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: colors.heading }}
                >
                  Harvest Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.harvest_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      harvest_date: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border outline-none transition-colors focus:border-green-700"
                  style={{
                    borderColor: colors.border,
                    borderRadius: "4px",
                    color: colors.heading,
                  }}
                />
              </div>
            )}

            {/* Min Order */}
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: colors.heading }}
              >
                Minimum Order
              </label>
              <input
                type="number"
                min="1"
                value={formData.minimum_order}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    minimum_order: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 border outline-none transition-colors focus:border-green-700"
                style={{
                  borderColor: colors.border,
                  borderRadius: "4px",
                  color: colors.heading,
                }}
              />
            </div>

            {/* Max Order */}
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: colors.heading }}
              >
                Maximum Order
              </label>
              <input
                type="number"
                min="1"
                value={formData.maximum_order}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maximum_order: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 border outline-none transition-colors focus:border-green-700"
                style={{
                  borderColor: colors.border,
                  borderRadius: "4px",
                  color: colors.heading,
                }}
              />
            </div>
          </div>

          {/* Organic & Harvest Toggle */}
          <div className="mt-4 flex flex-col gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className="w-5 h-5 border rounded flex items-center justify-center"
                style={{
                  borderColor: formData.is_organic
                    ? colors.accent
                    : colors.border,
                  backgroundColor: formData.is_organic
                    ? colors.accent
                    : "transparent",
                }}
              >
                {formData.is_organic && (
                  <Check size={14} color={colors.white} />
                )}
              </div>
              <input
                type="checkbox"
                checked={formData.is_organic}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_organic: e.target.checked,
                  }))
                }
                className="sr-only"
              />
              <span style={{ color: colors.heading }}>
                This is an organic product
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className="w-5 h-5 border rounded flex items-center justify-center"
                style={{
                  borderColor: formData.is_harvest
                    ? colors.accent
                    : colors.border,
                  backgroundColor: formData.is_harvest
                    ? colors.accent
                    : "transparent",
                }}
              >
                {formData.is_harvest && (
                  <Check size={14} color={colors.white} />
                )}
              </div>
              <input
                type="checkbox"
                checked={formData.is_harvest}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_harvest: e.target.checked,
                  }))
                }
                className="sr-only"
              />
              <span style={{ color: colors.heading }}>
                Enable Harvest Mode (Pre-order with deposit)
              </span>
            </label>

            {formData.is_harvest && (
              <div className="pl-8 grid gap-2">
                <label
                  className="block text-sm font-medium"
                  style={{ color: colors.heading }}
                >
                  Target Harvest Amount ({formData.unit}) *
                </label>
                <input
                  type="number"
                  required={formData.is_harvest}
                  min="1"
                  value={formData.target_amount}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, target_amount: e.target.value }))
                  }
                  placeholder="e.g., 500"
                  className="w-full sm:w-1/2 px-4 py-2 border outline-none transition-colors focus:border-green-700"
                  style={{
                    borderColor: colors.border,
                    borderRadius: "4px",
                    color: colors.heading,
                  }}
                />
                <p className="text-xs text-gray-500">
                  Orders will be capped at this amount. Customers pay 20% deposit.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Images */}
        <div
          className="p-6 border"
          style={{
            backgroundColor: colors.white,
            borderColor: colors.border,
            borderRadius: "4px",
          }}
        >
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: colors.heading }}
          >
            Product Images
          </h2>

          {/* Image URL Input */}
          <div className="flex gap-2 mb-4">
            <input
              type="url"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="Enter image URL"
              className="flex-1 px-4 py-2 border outline-none transition-colors focus:border-green-700"
              style={{
                borderColor: colors.border,
                borderRadius: "4px",
                color: colors.heading,
              }}
            />
            <button
              type="button"
              onClick={handleAddImage}
              className="px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: colors.accent,
                color: colors.white,
                borderRadius: "4px",
              }}
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Image Grid */}
          {formData.images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {formData.images.map((img, index) => (
                <div
                  key={index}
                  className="relative aspect-square border rounded overflow-hidden group"
                  style={{
                    borderColor: img.is_primary ? colors.accent : colors.border,
                  }}
                >
                  <img
                    src={img.url}
                    alt={`Product image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {img.is_primary && (
                    <span
                      className="absolute top-2 left-2 text-xs px-2 py-0.5"
                      style={{
                        backgroundColor: colors.accent,
                        color: colors.white,
                        borderRadius: "4px",
                      }}
                    >
                      Primary
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {!img.is_primary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(index)}
                        className="p-2 bg-white rounded"
                        title="Set as primary"
                      >
                        <Check size={16} style={{ color: colors.accent }} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="p-2 bg-white rounded"
                      title="Remove"
                    >
                      <X size={16} style={{ color: colors.error }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="p-8 border-2 border-dashed text-center"
              style={{ borderColor: colors.border, borderRadius: "4px" }}
            >
              <ImageIcon
                size={40}
                className="mx-auto mb-2"
                style={{ color: colors.border }}
              />
              <p className="text-sm" style={{ color: colors.body }}>
                Add product images by entering URLs above
              </p>
            </div>
          )}
        </div>

        {/* Tags */}
        <div
          className="p-6 border"
          style={{
            backgroundColor: colors.white,
            borderColor: colors.border,
            borderRadius: "4px",
          }}
        >
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: colors.heading }}
          >
            Tags
          </h2>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && (e.preventDefault(), handleAddTag())
              }
              placeholder="Add a tag (e.g., fresh, local)"
              className="flex-1 px-4 py-2 border outline-none transition-colors focus:border-green-700"
              style={{
                borderColor: colors.border,
                borderRadius: "4px",
                color: colors.heading,
              }}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: colors.accent,
                color: colors.white,
                borderRadius: "4px",
              }}
            >
              Add
            </button>
          </div>

          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm"
                  style={{
                    backgroundColor: colors.successBg,
                    color: colors.accent,
                    borderRadius: "4px",
                  }}
                >
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)}>
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Specifications */}
        <div
          className="p-6 border"
          style={{
            backgroundColor: colors.white,
            borderColor: colors.border,
            borderRadius: "4px",
          }}
        >
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: colors.heading }}
          >
            Specifications
          </h2>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newSpecKey}
              onChange={(e) => setNewSpecKey(e.target.value)}
              placeholder="Attribute (e.g., Weight)"
              className="flex-1 px-4 py-2 border outline-none transition-colors focus:border-green-700"
              style={{
                borderColor: colors.border,
                borderRadius: "4px",
                color: colors.heading,
              }}
            />
            <input
              type="text"
              value={newSpecValue}
              onChange={(e) => setNewSpecValue(e.target.value)}
              placeholder="Value (e.g., 500g)"
              className="flex-1 px-4 py-2 border outline-none transition-colors focus:border-green-700"
              style={{
                borderColor: colors.border,
                borderRadius: "4px",
                color: colors.heading,
              }}
            />
            <button
              type="button"
              onClick={handleAddSpecification}
              className="px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: colors.accent,
                color: colors.white,
                borderRadius: "4px",
              }}
            >
              Add
            </button>
          </div>

          {formData.specifications.length > 0 && (
            <div className="space-y-2">
              {formData.specifications.map((spec, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between px-4 py-2 border"
                  style={{
                    borderColor: colors.border,
                    borderRadius: "4px",
                  }}
                >
                  <div>
                    <span
                      className="font-medium"
                      style={{ color: colors.heading }}
                    >
                      {spec.key}:
                    </span>{" "}
                    <span style={{ color: colors.body }}>{spec.value}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecification(index)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X size={16} style={{ color: colors.error }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Link
            href="/farmer/products"
            className="px-6 py-3 border text-sm font-medium"
            style={{
              borderColor: colors.border,
              borderRadius: "4px",
              color: colors.body,
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 text-sm font-medium disabled:opacity-50"
            style={{
              backgroundColor: colors.accent,
              color: colors.white,
              borderRadius: "4px",
            }}
          >
            {isLoading ? "Creating..." : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}
