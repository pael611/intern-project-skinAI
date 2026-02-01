"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus, Search, Edit2, Trash2, ExternalLink, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// Types & Interfaces
interface Product {
  id_product: string;
  nama_product: string;
  label: string;
  brand: string;
  harga: number;
  gambar: string;
  link: string;
}

type FormData = {
  id_product: string;
  nama_product: string;
  label: string;
  brand: string;
  harga: string | number;
  gambar: string;
  link: string;
}
// add changes for folder name

type LabelType = 'Acne' | 'Blackheads' | 'Dark Spots' | 'Normal Skin' | 'Oily Skin' | 'Wrinkles';

const ProductMasterAdmin: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Omit<FormData, 'id_product'>>({
    nama_product: '',
    label: '',
    brand: '',
    harga: '',
    gambar: '',
    link: ''
 });


  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleAdd = (): void => {
    setEditingProduct(null);
    setFormData({
        nama_product: '',
        label: '',
        brand: '',
        harga: '',
        gambar: '',
        link: ''
    });
    setShowModal(true);
  };

  const handleEdit = (product: Product): void => {
    setEditingProduct(product);
    // Exclude id_product from formData
    const { id_product, ...rest } = product;
    setFormData(rest);
    setShowModal(true);
  };

  // Ambil data dari Supabase saat komponen mount
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase.from('product').select('*');
      if (data) setProducts(data);
    };
    fetchProducts();
  }, []);

  // CREATE
  const handleSubmit = async () => {
    if (!formData.nama_product || !formData.brand || !formData.label || !formData.harga || !formData.gambar || !formData.link) {
      alert('Mohon lengkapi semua field');
      return;
    }

    if (editingProduct) {
      // UPDATE
      await supabase.from('product').update({
        ...formData,
        harga: parseFloat(formData.harga.toString())
      }).eq('id_product', editingProduct.id_product);
    } else {
      // CREATE
      await supabase.from('product').insert([{
        ...formData,
        harga: parseFloat(formData.harga.toString())
      }]);
    }

    // Refresh data dari database
    const { data } = await supabase.from('product').select('*');
    if (data) setProducts(data);
    setShowModal(false);
  };

  // DELETE
  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      await supabase.from('product').delete().eq('id_product', id);
      // Refresh data dari database
      const { data } = await supabase.from('product').select('*');
      if (data) setProducts(data);
    }
  };

  const filteredProducts: Product[] = products.filter(product =>
    product.nama_product.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.id_product.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLabelColor = (label: string): string => {
    const colors: Record<string, string> = {
      'Acne': 'bg-yellow-100 text-yellow-800',
      'Blackheads': 'bg-green-100 text-green-800',
      'Dark Spots': 'bg-red-100 text-red-800',
      'Normal Skin': 'bg-purple-100 text-purple-800',
      'Oily Skin': 'bg-blue-100 text-blue-800',
      'Wrinkles': 'bg-pink-100 text-pink-800'
    };
    return colors[label] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Product Master</h1>
          <p className="text-slate-600">Kelola semua produk Anda dalam satu tempat</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari produk, brand, atau ID..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Tambah Produk
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Id Produk</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Gambar</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Nama Produk</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Brand</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Label</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Harga</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Link</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredProducts.map((product: Product) => (
                  <tr key={product.id_product} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{product.id_product}</td>
                    <td className="px-6 py-4">
                      <Image
                        src={product.gambar}
                        alt={product.nama_product}
                        width={64}
                        height={64}
                        className="w-16 h-16 object-cover rounded-lg"
                        loader={({ src }) => src}
                        unoptimized
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{product.nama_product}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{product.brand}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getLabelColor(product.label)}`}>
                        {product.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{formatCurrency(product.harga)}</td>
                    <td className="px-6 py-4">
                      <a 
                        href={product.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Lihat
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          aria-label="Edit product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id_product)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="Delete product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <p>Tidak ada produk ditemukan</p>
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-slate-600">
          Menampilkan {filteredProducts.length} dari {products.length} produk
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-slate-800">
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
            
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setFormData({...formData, brand: e.target.value})
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
            
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nama Produk</label>
                <input
                  type="text"
                  value={formData.nama_product}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setFormData({...formData, nama_product: e.target.value})
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Label</label>
                  <select
                    value={formData.label}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                      setFormData({...formData, label: e.target.value})
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Pilih Label</option>
                    <option value="Acne">Acne</option>
                    <option value="Blackheads">Blackheads</option>
                    <option value="Dark Spots">Dark Spots</option>
                    <option value="Normal Skin">Normal Skin</option>
                    <option value="Oily Skin">Oily Skin</option>
                    <option value="Wrinkles">Wrinkles</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Harga (IDR)</label>
                  <input
                    type="number"
                    value={formData.harga}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setFormData({...formData, harga: e.target.value})
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">URL Gambar</label>
                <input
                  type="url"
                  value={formData.gambar}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setFormData({...formData, gambar: e.target.value})
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Link Produk</label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setFormData({...formData, link: e.target.value})
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/product"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {editingProduct ? 'Update' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductMasterAdmin;