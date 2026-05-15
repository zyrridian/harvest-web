"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Bell,
  Heart,
  Package,
  MessageSquare,
  Settings,
  LogOut,
  ChevronRight,
  Camera,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChefHat,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../client/api/client";
import { useAuthStore } from "../../client/store/auth.store";

interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  user_type: string;
  is_verified: boolean;
  created_at: string;
  profile?: {
    bio: string | null;
    date_of_birth: string | null;
    gender: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    preferred_language: string;
    notification_preferences: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  stats?: {
    total_orders: number;
    total_spent: number;
    favorites_count: number;
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { logout, checkAuth } = useAuthStore();
  
  const [editing, setEditing] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const { data: userProfile, isLoading, error: fetchError } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const { data, error } = await apiClient<UserProfile>("/auth/me");
      if (error) throw new Error(error);
      return data;
    },
    retry: false,
  });

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || "");
      setPhoneNumber(userProfile.phone_number || "");
      setBio(userProfile.profile?.bio || "");
      setAddress(userProfile.profile?.address || "");
      setCity(userProfile.profile?.city || "");
    }
  }, [userProfile]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient<any>("/users/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          phone_number: phoneNumber || null,
          bio: bio || null,
          address: address || null,
          city: city || null,
        }),
      });
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      checkAuth(); // Update global user store
      setEditing(false);
    },
  });

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  if (fetchError || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center">
          <p className="mb-4 text-error">
            Failed to load profile
          </p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["userProfile"] })}
            className="px-6 py-2 text-sm font-medium bg-accent text-white rounded hover:bg-accent-hover"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const menuItems = [
    {
      icon: Package,
      label: "My Orders",
      description: `${userProfile.stats?.total_orders || 0} orders`,
      href: "/orders",
    },
    {
      icon: Heart,
      label: "Favorites",
      description: `${userProfile.stats?.favorites_count || 0} items`,
      href: "/profile/favorites",
    },
    {
      icon: MapPin,
      label: "Addresses",
      description: "Manage delivery addresses",
      href: "/profile/addresses",
    },
    {
      icon: Bell,
      label: "Notifications",
      description: "Notification preferences",
      href: "/notifications",
    },
    {
      icon: MessageSquare,
      label: "Messages",
      description: "Chat with sellers",
      href: "/messages",
    },
    {
      icon: ChefHat,
      label: "My Recipes",
      description: "Share your cooking",
      href: "/profile/recipes",
    },
    {
      icon: Settings,
      label: "Settings",
      description: "Account settings",
      href: "/profile/settings",
    },
  ];

  return (
    <div className="min-h-screen pb-24 md:pb-8 bg-background">
      {/* Header */}
      <div className="border-b bg-white border-border">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Avatar & basic info */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 flex items-center justify-center overflow-hidden bg-background rounded">
                {userProfile.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={32} className="text-accent" />
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 w-8 h-8 flex items-center justify-center border bg-white border-border rounded shadow-sm hover:bg-stone-50">
                <Camera size={14} className="text-body" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold truncate text-heading">
                  {userProfile.name}
                </h1>
                {userProfile.is_verified && (
                  <CheckCircle size={18} className="text-success" />
                )}
              </div>
              <p className="text-sm truncate text-body">
                {userProfile.email}
              </p>
              <p className="text-xs mt-1 text-body">
                Member since{" "}
                {new Date(userProfile.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Stats */}
          {userProfile.stats && (
            <div className="grid grid-cols-3 gap-4 mt-6 p-4 border bg-background border-border rounded">
              <div className="text-center">
                <p className="text-xl font-bold text-heading">
                  {userProfile.stats.total_orders}
                </p>
                <p className="text-xs text-body">
                  Orders
                </p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-heading">
                  {userProfile.stats.favorites_count}
                </p>
                <p className="text-xs text-body">
                  Favorites
                </p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-accent">
                  IDR {(userProfile.stats.total_spent / 1000000).toFixed(1)}M
                </p>
                <p className="text-xs text-body">
                  Spent
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Messages */}
        {updateProfileMutation.isError && (
          <div className="flex items-center gap-3 p-4 mb-6 border bg-error-bg border-error rounded">
            <AlertCircle size={18} className="text-error" />
            <p className="text-sm text-error">
              {updateProfileMutation.error?.message}
            </p>
          </div>
        )}

        {updateProfileMutation.isSuccess && (
          <div className="flex items-center gap-3 p-4 mb-6 border bg-success-bg border-success rounded">
            <CheckCircle size={18} className="text-success" />
            <p className="text-sm text-success">
              Profile updated successfully
            </p>
          </div>
        )}

        {/* Profile info / Edit form */}
        <div className="border mb-6 bg-white border-border rounded">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-heading">
              Personal Information
            </h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="text-sm font-medium text-accent hover:text-accent-hover"
              >
                Edit
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditing(false);
                  updateProfileMutation.reset();
                }}
                className="text-sm font-medium text-body hover:text-heading"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="p-4">
            {!editing ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User size={18} className="text-accent" />
                  <div>
                    <p className="text-xs text-body">Full Name</p>
                    <p className="text-sm font-medium text-heading">
                      {userProfile.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-accent" />
                  <div>
                    <p className="text-xs text-body">Email</p>
                    <p className="text-sm font-medium text-heading">
                      {userProfile.email}
                    </p>
                  </div>
                </div>

                {userProfile.phone_number && (
                  <div className="flex items-center gap-3">
                    <Phone size={18} className="text-accent" />
                    <div>
                      <p className="text-xs text-body">Phone</p>
                      <p className="text-sm font-medium text-heading">
                        {userProfile.phone_number}
                      </p>
                    </div>
                  </div>
                )}

                {userProfile.profile?.city && (
                  <div className="flex items-center gap-3">
                    <MapPin size={18} className="text-accent" />
                    <div>
                      <p className="text-xs text-body">Location</p>
                      <p className="text-sm font-medium text-heading">
                        {userProfile.profile.city}
                        {userProfile.profile.state && `, ${userProfile.profile.state}`}
                      </p>
                    </div>
                  </div>
                )}

                {userProfile.profile?.bio && (
                  <div>
                    <p className="text-xs mb-1 text-body">Bio</p>
                    <p className="text-sm text-heading">
                      {userProfile.profile.bio}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateProfileMutation.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm border border-border rounded outline-none focus:border-accent text-heading"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded outline-none focus:border-accent text-heading"
                    placeholder="+62 812 3456 7890"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded outline-none focus:border-accent text-heading"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">
                      Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded outline-none focus:border-accent text-heading"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-border rounded outline-none focus:border-accent text-heading"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="w-full py-2.5 text-sm font-medium transition-colors bg-accent text-white rounded disabled:opacity-50 hover:bg-accent-hover"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Menu items */}
        <div className="border divide-y bg-white border-border rounded">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-stone-50"
              >
                <div className="w-10 h-10 flex items-center justify-center bg-background rounded">
                  <Icon size={20} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-heading">
                    {item.label}
                  </p>
                  <p className="text-xs text-body">
                    {item.description}
                  </p>
                </div>
                <ChevronRight size={18} className="text-body" />
              </Link>
            );
          })}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full mt-6 p-4 border flex items-center justify-center gap-2 text-sm font-medium transition-colors bg-white border-error text-error rounded hover:bg-error-bg"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
