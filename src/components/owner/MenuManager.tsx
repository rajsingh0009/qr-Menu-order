'use client';

import React, { useState, useEffect } from 'react';
import { Restaurant, MenuCategory, MenuItem } from '@/types/database';
import { Store } from '@/lib/store';
import { compressImage } from '@/lib/image-compress';
import {
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Check,
  X,
  Upload,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Search,
} from 'lucide-react';

interface Props {
  restaurant: Restaurant;
}

export function MenuManager({ restaurant }: Props) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemFormData, setItemFormData] = useState({
    name: '',
    category_id: '',
    price: 0,
    description: '',
    is_veg: true,
    is_available: true,
    image_url: '',
  });
  const [isCompressingImage, setIsCompressingImage] = useState(false);

  const loadData = () => {
    setCategories(Store.getCategories(restaurant.id));
    setMenuItems(Store.getMenuItems(restaurant.id));
  };

  useEffect(() => {
    loadData();
    window.addEventListener('qrsaas_storage_update', loadData);
    return () => window.removeEventListener('qrsaas_storage_update', loadData);
  }, [restaurant.id]);

  // Category Actions
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    if (editingCategory) {
      Store.updateCategory(editingCategory.id, { name: categoryName.trim() });
    } else {
      Store.createCategory(restaurant.id, categoryName.trim(), categories.length + 1);
    }

    setCategoryName('');
    setEditingCategory(null);
    setIsCategoryModalOpen(false);
    loadData();
  };

  const handleDeleteCategory = (catId: string) => {
    if (confirm('Delete this category? Items in this category will become unassigned.')) {
      Store.deleteCategory(catId);
      loadData();
    }
  };

  // Item Actions
  const handleOpenAddItem = (catId?: string) => {
    setEditingItem(null);
    setItemFormData({
      name: '',
      category_id: catId || categories[0]?.id || '',
      price: 150,
      description: '',
      is_veg: true,
      is_available: true,
      image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=350&fit=crop',
    });
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemFormData({
      name: item.name,
      category_id: item.category_id || '',
      price: item.price,
      description: item.description || '',
      is_veg: item.is_veg,
      is_available: item.is_available,
      image_url: item.image_url || '',
    });
    setIsItemModalOpen(true);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingImage(true);
      // Compress image client side
      const { dataUrl } = await compressImage(file, 800, 800, 0.75);
      setItemFormData((prev) => ({ ...prev, image_url: dataUrl }));
    } catch (err) {
      alert('Error compressing image');
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormData.name.trim()) return;

    if (editingItem) {
      Store.updateMenuItem(editingItem.id, {
        name: itemFormData.name.trim(),
        category_id: itemFormData.category_id || null,
        price: Number(itemFormData.price),
        description: itemFormData.description.trim(),
        is_veg: itemFormData.is_veg,
        is_available: itemFormData.is_available,
        image_url: itemFormData.image_url,
      });
    } else {
      Store.createMenuItem({
        restaurant_id: restaurant.id,
        category_id: itemFormData.category_id || null,
        name: itemFormData.name.trim(),
        price: Number(itemFormData.price),
        description: itemFormData.description.trim(),
        is_veg: itemFormData.is_veg,
        is_available: itemFormData.is_available,
        image_url: itemFormData.image_url,
        sort_order: menuItems.length + 1,
      });
    }

    setIsItemModalOpen(false);
    loadData();
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm('Delete this menu dish?')) {
      Store.deleteMenuItem(itemId);
      loadData();
    }
  };

  const handleToggleAvailable = (item: MenuItem) => {
    Store.updateMenuItem(item.id, { is_available: !item.is_available });
    loadData();
  };

  // Filtered menu items
  const filteredItems = menuItems.filter((m) => {
    if (activeCategoryFilter !== 'all' && m.category_id !== activeCategoryFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Menu & Catalog Manager</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize dish categories, prices, veg/non-veg tags, and live sold-out statuses.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setEditingCategory(null);
              setCategoryName('');
              setIsCategoryModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>

          <button
            onClick={() => handleOpenAddItem()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition shadow-md shadow-orange-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Dish Item</span>
          </button>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCategoryFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeCategoryFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Dishes ({menuItems.length})
          </button>

          {categories.map((cat) => {
            const count = menuItems.filter((m) => m.category_id === cat.id).length;
            return (
              <div key={cat.id} className="relative group flex items-center">
                <button
                  onClick={() => setActiveCategoryFilter(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    activeCategoryFilter === cat.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat.name} ({count})
                </button>
                <button
                  onClick={() => {
                    setEditingCategory(cat);
                    setCategoryName(cat.name);
                    setIsCategoryModalOpen(true);
                  }}
                  className="ml-1 p-1 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition"
                  title="Rename category"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
      </div>

      {/* Dishes Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm">
          <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-800">No menu items found</h4>
          <p className="text-xs text-slate-500 mt-0.5">Click "Add Dish Item" to add delicious items to your menu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const cat = categories.find((c) => c.id === item.category_id);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between ${
                  !item.is_available ? 'opacity-60 bg-slate-50/50' : ''
                }`}
              >
                {/* Item Image */}
                <div className="relative h-44 bg-slate-100">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ImageIcon className="w-10 h-10" />
                    </div>
                  )}

                  {/* Veg / Non-Veg badge */}
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                    <span
                      className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-emerald-600' : 'bg-rose-600'}`}
                    />
                    <span className="text-[10px] font-black uppercase text-slate-800">
                      {item.is_veg ? 'Veg' : 'Non-Veg'}
                    </span>
                  </div>

                  {/* Sold-out overlay tag */}
                  {!item.is_available && (
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                      <span className="bg-rose-600 text-white font-black text-xs uppercase px-3 py-1 rounded-full shadow-lg">
                        Sold Out
                      </span>
                    </div>
                  )}

                  {/* Category Pill */}
                  {cat && (
                    <div className="absolute bottom-3 left-3 bg-slate-900/80 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                      {cat.name}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-extrabold text-slate-900 text-sm">{item.name}</h3>
                      <span className="font-black text-orange-600 text-sm whitespace-nowrap">
                        ₹{item.price}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                    )}
                  </div>

                  {/* Quick Controls */}
                  <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between">
                    {/* Live Sold-out Toggle */}
                    <button
                      onClick={() => handleToggleAvailable(item)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        item.is_available
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.is_available ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      <span>{item.is_available ? 'Available' : 'Sold Out'}</span>
                    </button>

                    {/* Edit & Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditItem(item)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                        title="Edit Dish"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Dish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Category Add/Edit */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              {editingCategory ? 'Rename Category' : 'Create Category'}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tandoori Starters, Mocktails..."
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-between items-center pt-3">
                {editingCategory && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(editingCategory.id)}
                    className="text-rose-600 hover:underline font-bold"
                  >
                    Delete Category
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-orange-600 text-white font-bold rounded-lg shadow-sm"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Dish Item Add/Edit */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">
              {editingItem ? 'Edit Dish' : 'Add New Dish'}
            </h3>

            <form onSubmit={handleSaveItem} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dish Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paneer Butter Masala"
                  value={itemFormData.name}
                  onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={itemFormData.category_id}
                    onChange={(e) => setItemFormData({ ...itemFormData, category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={itemFormData.price}
                    onChange={(e) => setItemFormData({ ...itemFormData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Ingredients, preparation style, spice level..."
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Photo Upload with Client Compression */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Photo (Compressed automatically)</label>
                <div className="flex items-center gap-3">
                  {itemFormData.image_url && (
                    <img
                      src={itemFormData.image_url}
                      alt="Preview"
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                    />
                  )}
                  <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer text-slate-700 font-bold transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isCompressingImage ? 'Compressing...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Veg / Non-Veg & Available */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_veg"
                    checked={itemFormData.is_veg}
                    onChange={(e) => setItemFormData({ ...itemFormData, is_veg: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label htmlFor="is_veg" className="font-semibold text-slate-700 cursor-pointer">
                    Pure Vegetarian
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_available"
                    checked={itemFormData.is_available}
                    onChange={(e) => setItemFormData({ ...itemFormData, is_available: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <label htmlFor="is_available" className="font-semibold text-slate-700 cursor-pointer">
                    Available (In Stock)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCompressingImage}
                  className="px-4 py-1.5 bg-orange-600 text-white font-bold rounded-lg shadow-sm disabled:opacity-50"
                >
                  Save Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
