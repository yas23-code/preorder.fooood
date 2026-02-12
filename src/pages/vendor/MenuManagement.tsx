import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Plus, Pencil, Trash2, UtensilsCrossed, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MenuItem {
  id: string;
  canteen_id: string;
  category: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  prep_time: number | null;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  canteen_id: string;
  name: string;
}

export default function MenuManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [canteenId, setCanteenId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Form state for adding new items
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrepTime, setFormPrepTime] = useState('');
  const [formAvailable, setFormAvailable] = useState(true);
  const [formImage, setFormImage] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [formCategoryImage, setFormCategoryImage] = useState<File | null>(null);
  const [formCategoryImagePreview, setFormCategoryImagePreview] = useState<string | null>(null);
  const categoryImageInputRef = useRef<HTMLInputElement>(null);
  const addImageInputRef = useRef<HTMLInputElement>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPrepTime, setEditPrepTime] = useState('');
  const [editAvailable, setEditAvailable] = useState(true);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const { data: canteen } = await supabase
        .from('canteens')
        .select('id')
        .eq('vendor_id', user.id)
        .maybeSingle();
      
      if (!canteen) {
        setIsLoading(false);
        return;
      }

      setCanteenId(canteen.id);

      const { data: itemsData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('canteen_id', canteen.id)
        .order('category')
        .order('name');
      
      setItems(itemsData || []);

      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('canteen_id', canteen.id);
      
      setCategories(categoriesData || []);
      setIsLoading(false);
    };

    fetchData();
  }, [user]);

  const uploadImage = async (file: File, itemId: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${itemId}-${Date.now()}.${fileExt}`;
    const filePath = `${canteenId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleAddImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCategoryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormCategoryImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormCategoryImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAddImage = () => {
    setFormImage(null);
    setFormImagePreview(null);
    if (addImageInputRef.current) {
      addImageInputRef.current.value = '';
    }
  };

  const clearCategoryImage = () => {
    setFormCategoryImage(null);
    setFormCategoryImagePreview(null);
    if (categoryImageInputRef.current) {
      categoryImageInputRef.current.value = '';
    }
  };

  const clearEditImage = () => {
    setEditImage(null);
    setEditImagePreview(null);
    if (editImageInputRef.current) {
      editImageInputRef.current.value = '';
    }
  };

  const resetAddForm = () => {
    setFormName('');
    setFormDescription('');
    setFormPrice('');
    setFormCategory('');
    setFormPrepTime('');
    setFormAvailable(true);
    clearAddImage();
    clearCategoryImage();
  };

  const uploadCategoryImage = async (file: File, categoryId: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `category-${categoryId}-${Date.now()}.${fileExt}`;
    const filePath = `${canteenId}/categories/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleAddItem = async () => {
    if (!formName || !formPrice || !formCategory || !canteenId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);

    // Trim category name to avoid duplicates with trailing spaces
    const trimmedCategory = formCategory.trim();

    try {
      // Check if category exists, if not create it (case-insensitive check with trim)
      const existingCategory = categories.find(c => c.name.toLowerCase().trim() === trimmedCategory.toLowerCase());
      
      if (!existingCategory) {
        // Create new category with trimmed name
        const { data: newCategory, error: categoryError } = await supabase
          .from('categories')
          .insert({ canteen_id: canteenId, name: trimmedCategory })
          .select()
          .single();
        
        if (categoryError) throw categoryError;

        let categoryImageUrl: string | null = null;

        // Upload category image if provided
        if (formCategoryImage && newCategory) {
          categoryImageUrl = await uploadCategoryImage(formCategoryImage, newCategory.id);
          
          const { error: catUpdateError } = await supabase
            .from('categories')
            .update({ image_url: categoryImageUrl })
            .eq('id', newCategory.id);
          
          if (catUpdateError) throw catUpdateError;
        }

        setCategories(prev => [...prev, { ...newCategory, image_url: categoryImageUrl }]);
      } else if (formCategoryImage) {
        // Update existing category with new image
        const categoryImageUrl = await uploadCategoryImage(formCategoryImage, existingCategory.id);
        
        const { error: catUpdateError } = await supabase
          .from('categories')
          .update({ image_url: categoryImageUrl })
          .eq('id', existingCategory.id);
        
        if (catUpdateError) throw catUpdateError;
        
        setCategories(prev => prev.map(c => 
          c.id === existingCategory.id ? { ...c, image_url: categoryImageUrl } : c
        ));
      }

      // Create the menu item with trimmed category name
      const { data, error } = await supabase
        .from('menu_items')
        .insert({
          canteen_id: canteenId,
          category: trimmedCategory,
          name: formName.trim(),
          description: formDescription?.trim() || null,
          price: parseFloat(formPrice),
          prep_time: formPrepTime ? parseInt(formPrepTime) : null,
          is_available: formAvailable,
        })
        .select()
        .single();
      
      if (error) throw error;

      let imageUrl: string | null = null;

      // If there's an image, upload it and update the item
      if (formImage && data) {
        imageUrl = await uploadImage(formImage, data.id);
        
        const { error: updateError } = await supabase
          .from('menu_items')
          .update({ image_url: imageUrl })
          .eq('id', data.id);
        
        if (updateError) throw updateError;
      }
      
      setItems(prev => [...prev, { ...data, image_url: imageUrl }]);
      toast.success('Item added successfully');
      resetAddForm();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditDescription(item.description || '');
    setEditPrice(item.price.toString());
    setEditCategory(item.category);
    setEditPrepTime(item.prep_time ? item.prep_time.toString() : '');
    setEditAvailable(item.is_available);
    setEditImage(null);
    setEditImagePreview(item.image_url);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editName || !editPrice || !editCategory || !editingItem) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);

    // Trim category name to avoid duplicates
    const trimmedCategory = editCategory.trim();

    try {
      let imageUrl = editingItem.image_url;

      // If there's a new image, upload it
      if (editImage) {
        imageUrl = await uploadImage(editImage, editingItem.id);
      }

      const { error } = await supabase
        .from('menu_items')
        .update({
          name: editName.trim(),
          description: editDescription?.trim() || null,
          price: parseFloat(editPrice),
          category: trimmedCategory,
          prep_time: editPrepTime ? parseInt(editPrepTime) : null,
          is_available: editAvailable,
          image_url: imageUrl,
        })
        .eq('id', editingItem.id);
      
      if (error) throw error;
      
      setItems(prev =>
        prev.map(item =>
          item.id === editingItem.id
            ? {
                ...item,
                name: editName.trim(),
                description: editDescription?.trim() || null,
                price: parseFloat(editPrice),
                category: trimmedCategory,
                prep_time: editPrepTime ? parseInt(editPrepTime) : null,
                is_available: editAvailable,
                image_url: imageUrl,
              }
            : item
        )
      );
      toast.success('Item updated successfully');
      setIsEditDialogOpen(false);
      setEditingItem(null);
      clearEditImage();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      
      setItems(prev => prev.filter(item => item.id !== itemId));
      toast.success('Item deleted');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const addDefaultCategories = async () => {
    if (!canteenId) return;
    
    const defaultCategories = ['Breakfast', 'Lunch', 'Snacks', 'Beverages', 'Desserts'];
    
    try {
      for (const name of defaultCategories) {
        const exists = categories.some(c => c.name.toLowerCase() === name.toLowerCase());
        if (!exists) {
          const { data, error } = await supabase
            .from('categories')
            .insert({ canteen_id: canteenId, name })
            .select()
            .single();
          
          if (!error && data) {
            setCategories(prev => [...prev, data]);
          }
        }
      }
      toast.success('Default categories added');
    } catch (error) {
      console.error('Error adding categories:', error);
      toast.error('Failed to add categories');
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    // Check if category has items
    const itemsInCategory = items.filter(item => item.category === categoryName);
    if (itemsInCategory.length > 0) {
      toast.error(`Cannot delete category "${categoryName}" - it has ${itemsInCategory.length} item(s). Delete the items first.`);
      return;
    }

    const categoryToDelete = categories.find(c => c.name === categoryName);
    if (!categoryToDelete) {
      toast.error('Category not found');
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryToDelete.id);
      
      if (error) throw error;
      
      setCategories(prev => prev.filter(c => c.id !== categoryToDelete.id));
      toast.success(`Category "${categoryName}" deleted`);
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  // Get unique categories with counts (case-insensitive to avoid duplicates)
  const categoryWithCounts = (() => {
    const categoryMap = new Map<string, { name: string; count: number }>();
    
    // Add categories from the categories table first
    categories.forEach(c => {
      const key = c.name.toLowerCase().trim();
      if (!categoryMap.has(key)) {
        categoryMap.set(key, { name: c.name, count: 0 });
      }
    });
    
    // Count items per category (case-insensitive matching)
    items.forEach(item => {
      const key = item.category.toLowerCase().trim();
      if (categoryMap.has(key)) {
        categoryMap.get(key)!.count++;
      } else {
        // Category exists in items but not in categories table
        categoryMap.set(key, { name: item.category, count: 1 });
      }
    });
    
    return Array.from(categoryMap.values());
  })();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mcd-cream">
        <div className="border-b border-mcd-border bg-mcd-cream shadow-card">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center">
            <button onClick={() => navigate('/vendor/dashboard')} className="flex items-center gap-2 text-mcd-text hover:text-mcd-red transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="flex-1 text-center text-xl font-bold font-poppins text-mcd-text">Menu Management</h1>
            <div className="w-32" />
          </div>
        </div>
        <main className="page-container flex justify-center py-12">
          <LoadingSpinner text="Loading menu..." />
        </main>
      </div>
    );
  }

  if (!canteenId) {
    return (
      <div className="min-h-screen bg-mcd-cream">
        <div className="border-b border-mcd-border bg-mcd-cream shadow-card">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center">
            <button onClick={() => navigate('/vendor/dashboard')} className="flex items-center gap-2 text-mcd-text hover:text-mcd-red transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="flex-1 text-center text-xl font-bold font-poppins text-mcd-text">Menu Management</h1>
            <div className="w-32" />
          </div>
        </div>
        <main className="page-container">
          <EmptyState
            icon={UtensilsCrossed}
            title="No canteen registered"
            description="Please register your canteen first to manage your menu"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mcd-cream">
      {/* Header */}
      <div className="border-b border-mcd-border bg-mcd-cream shadow-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center">
          <button onClick={() => navigate('/vendor/dashboard')} className="flex items-center gap-2 text-mcd-text hover:text-mcd-red transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="flex-1 text-center text-xl font-bold font-poppins text-mcd-text">Menu Management</h1>
          <div className="w-32" />
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Add Menu Item Form */}
          <div className="bg-white border border-mcd-border rounded-xl p-6 h-fit shadow-card">
            <h2 className="text-xl font-bold text-mcd-text mb-1">Add Menu Item</h2>
            <p className="text-sm text-mcd-text/70 mb-6">Add a new item to your menu</p>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="item-name" className="text-mcd-text font-medium">Item Name</Label>
                <Input
                  id="item-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder=""
                  className="bg-mcd-selected border-mcd-border focus:border-mcd-yellow"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="item-category" className="text-mcd-text font-medium">Category</Label>
                <div className="flex gap-2">
                  <Input
                    id="item-category"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Write category name (creates if new)"
                    className="bg-mcd-selected border-mcd-border focus:border-mcd-yellow flex-1"
                  />
                  <Button variant="outline" onClick={addDefaultCategories} className="shrink-0 border-mcd-border text-mcd-text hover:bg-mcd-selected">
                    Add Default
                  </Button>
                </div>
              </div>

              {/* Category Image Upload */}
              <div className="space-y-2">
                <Label className="text-mcd-text font-medium">Category Image (optional)</Label>
                <input
                  ref={categoryImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCategoryImageChange}
                  className="hidden"
                  id="category-image-input"
                />
                {formCategoryImagePreview ? (
                  <div className="relative">
                    <img
                      src={formCategoryImagePreview}
                      alt="Category Preview"
                      className="w-full h-24 object-cover rounded-lg border border-mcd-border"
                    />
                    <button
                      type="button"
                      onClick={clearCategoryImage}
                      className="absolute top-2 right-2 p-1 bg-mcd-red text-white rounded-full hover:bg-mcd-red/90 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="category-image-input"
                    className="flex items-center justify-center gap-2 w-full h-12 border-2 border-dashed border-mcd-border rounded-lg cursor-pointer bg-mcd-selected hover:bg-mcd-yellow/20 transition-colors"
                  >
                    <Upload className="h-4 w-4 text-mcd-yellow" />
                    <span className="text-sm text-mcd-text/70">Upload category image</span>
                  </label>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="item-description" className="text-mcd-text font-medium">Description</Label>
                <Textarea
                  id="item-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder=""
                  rows={4}
                  className="bg-mcd-selected border-mcd-border focus:border-mcd-yellow resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item-price" className="text-mcd-text font-medium">Price (₹)</Label>
                  <Input
                    id="item-price"
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder=""
                    min="0"
                    className="bg-mcd-selected border-mcd-border focus:border-mcd-yellow"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="item-prep-time" className="text-mcd-text font-medium">Prep Time (mins)</Label>
                  <Input
                    id="item-prep-time"
                    type="number"
                    value={formPrepTime}
                    onChange={(e) => setFormPrepTime(e.target.value)}
                    placeholder="Auto"
                    min="1"
                    max="120"
                    className="bg-mcd-selected border-mcd-border focus:border-mcd-yellow"
                  />
                  <p className="text-xs text-muted-foreground">Leave empty for auto</p>
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label className="text-mcd-text font-medium">Item Image (optional)</Label>
                <input
                  ref={addImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAddImageChange}
                  className="hidden"
                  id="add-image-input"
                />
                {formImagePreview ? (
                  <div className="relative">
                    <img
                      src={formImagePreview}
                      alt="Preview"
                      className="w-full h-40 object-cover rounded-lg border border-mcd-border"
                    />
                    <button
                      onClick={clearAddImage}
                      className="absolute top-2 right-2 p-1 bg-mcd-red text-white rounded-full hover:bg-mcd-red/90 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="add-image-input"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-mcd-border rounded-lg cursor-pointer bg-mcd-selected hover:bg-mcd-yellow/20 transition-colors"
                  >
                    <Upload className="h-8 w-8 text-mcd-yellow mb-2" />
                    <span className="text-sm text-mcd-text/70">Click to upload image</span>
                  </label>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="item-available" className="text-mcd-text font-medium">Available</Label>
                <Switch
                  id="item-available"
                  checked={formAvailable}
                  onCheckedChange={setFormAvailable}
                />
              </div>
              
              <Button 
                className="w-full bg-mcd-yellow hover:bg-mcd-yellow/90 text-mcd-text font-bold" 
                onClick={handleAddItem} 
                disabled={isSaving}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isSaving ? 'Adding...' : 'Add Item'}
              </Button>
            </div>
          </div>
          
          {/* Right Side - Categories and Menu Items */}
          <div className="space-y-6">
            {/* Categories Section */}
            <div className="bg-white border border-mcd-border rounded-xl p-6 shadow-card">
              <h2 className="text-xl font-bold text-mcd-text mb-1">Categories</h2>
              <p className="text-sm text-mcd-text/70 mb-4">Your current categories</p>
              
              <div className="flex flex-wrap gap-2">
                {categoryWithCounts.length > 0 ? (
                  categoryWithCounts.map(cat => (
                    <div key={cat.name} className="flex items-center gap-1">
                      <Badge 
                        className="bg-mcd-red hover:bg-mcd-red/90 text-white px-3 py-1 text-sm"
                      >
                        {cat.name} {cat.count > 0 && `(${cat.count})`}
                      </Badge>
                      <button
                        onClick={() => handleDeleteCategory(cat.name)}
                        className="p-1 hover:bg-mcd-selected rounded-full transition-colors"
                        title={cat.count > 0 ? 'Delete items first' : 'Delete category'}
                      >
                        <X className="h-3.5 w-3.5 text-mcd-text/70 hover:text-mcd-red" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-mcd-text/70 text-sm">No categories yet. Add items or click "Add Default" to create categories.</p>
                )}
              </div>
            </div>
            
            {/* Current Menu Items Section */}
            <div className="bg-card border border-amber-200 rounded-xl p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Current Menu Items</h2>
              
              {items.length > 0 ? (
                <div className="space-y-4">
                  {items.map(item => (
                    <div key={item.id} className="bg-card border border-amber-200 rounded-xl overflow-hidden">
                      <div className="p-4 flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-foreground">{item.name}</h3>
                          <p className="text-muted-foreground">₹{item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => openEditDialog(item)}
                            className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                      
                      {item.image_url && (
                        <div className="px-4 pb-4">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        </div>
                      )}
                      
                      <div className="px-4 pb-4 space-y-1">
                        <p className="text-sm">
                          <span className="text-muted-foreground">Status: </span>
                          <span className={item.is_available ? 'text-green-600' : 'text-red-600'}>
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Category: </span>
                          <span className="text-foreground">{item.category}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={UtensilsCrossed}
                  title="No menu items yet"
                  description="Start by adding your first menu item using the form"
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-mcd-cream border-mcd-border">
          <DialogHeader>
            <DialogTitle className="text-mcd-text">Edit Menu Item</DialogTitle>
            <DialogDescription className="text-mcd-text/70">Update the item details below</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-mcd-text font-medium">Name *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-mcd-selected border-mcd-border focus:border-mcd-yellow"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-mcd-text font-medium">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                className="bg-mcd-selected border-mcd-border focus:border-mcd-yellow"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price" className="text-mcd-text font-medium">Price (₹) *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  min="0"
                  className="bg-mcd-selected border-mcd-border focus:border-mcd-yellow"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-category" className="text-mcd-text font-medium">Category *</Label>
                <Input
                  id="edit-category"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="bg-mcd-selected border-mcd-border focus:border-mcd-yellow"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-prep-time" className="text-mcd-text font-medium">Prep Time (mins)</Label>
              <Input
                id="edit-prep-time"
                type="number"
                value={editPrepTime}
                onChange={(e) => setEditPrepTime(e.target.value)}
                placeholder="Auto (based on category)"
                min="1"
                max="120"
                className="bg-mcd-selected border-mcd-border focus:border-mcd-yellow"
              />
              <p className="text-xs text-muted-foreground">Leave empty to use category default</p>
            </div>

            {/* Edit Image Upload */}
            <div className="space-y-2">
              <Label className="text-mcd-text font-medium">Item Image</Label>
              <input
                ref={editImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleEditImageChange}
                className="hidden"
                id="edit-image-input"
              />
              {editImagePreview ? (
                <div className="relative">
                  <img
                    src={editImagePreview}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-lg border border-mcd-border"
                  />
                  <button
                    onClick={clearEditImage}
                    className="absolute top-2 right-2 p-1 bg-mcd-red text-white rounded-full hover:bg-mcd-red/90 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="edit-image-input"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-mcd-border rounded-lg cursor-pointer bg-mcd-selected hover:bg-mcd-yellow/20 transition-colors"
                >
                  <Upload className="h-8 w-8 text-mcd-yellow mb-2" />
                  <span className="text-sm text-mcd-text/70">Click to upload image</span>
                </label>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-available" className="text-mcd-text font-medium">Available for order</Label>
              <Switch
                id="edit-available"
                checked={editAvailable}
                onCheckedChange={setEditAvailable}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-mcd-border text-mcd-text hover:bg-mcd-selected">
              Cancel
            </Button>
            <Button className="bg-mcd-yellow hover:bg-mcd-yellow/90 text-mcd-text font-bold" onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
