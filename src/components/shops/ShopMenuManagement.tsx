import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Loader2, 
  Upload, 
  X, 
  Edit2, 
  Trash2,
  UtensilsCrossed,
  IndianRupee,
  Clock
} from 'lucide-react';

interface ShopMenuItem {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  is_available: boolean;
  prep_time: number | null;
  created_at: string;
  updated_at: string;
}

interface ShopMenuManagementProps {
  shopId: string;
}

export function ShopMenuManagement({ shopId }: ShopMenuManagementProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [menuItems, setMenuItems] = useState<ShopMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ShopMenuItem | null>(null);
  const [editingItem, setEditingItem] = useState<ShopMenuItem | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [prepTime, setPrepTime] = useState('10');
  const [isAvailable, setIsAvailable] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch menu items
  useEffect(() => {
    async function fetchMenuItems() {
      setLoading(true);
      const { data, error } = await supabase
        .from('shop_menu_items')
        .select('*')
        .eq('shop_id', shopId)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching menu items:', error);
        toast({
          title: 'Error',
          description: 'Failed to load menu items',
          variant: 'destructive',
        });
      } else {
        setMenuItems(data || []);
      }
      setLoading(false);
    }

    fetchMenuItems();
  }, [shopId, toast]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setCategory('');
    setPrepTime('10');
    setIsAvailable(true);
    setImageFile(null);
    setImagePreview(null);
    setEditingItem(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image under 5MB',
          variant: 'destructive',
        });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(editingItem?.image_url || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (item: ShopMenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || '');
    setPrice(item.price.toString());
    setCategory(item.category);
    setPrepTime((item.prep_time || 10).toString());
    setIsAvailable(item.is_available);
    setImagePreview(item.image_url);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !price || !category) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in name, price, and category',
        variant: 'destructive',
      });
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({
        title: 'Invalid price',
        description: 'Please enter a valid price',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      let imageUrl = editingItem?.image_url || null;

      // Upload new image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `shop-menu-${shopId}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('menu-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('menu-images')
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
      }

      const prepTimeNum = parseInt(prepTime) || 10;

      if (editingItem) {
        // Update existing item
        const { data, error } = await supabase
          .from('shop_menu_items')
          .update({
            name,
            description: description || null,
            price: priceNum,
            category,
            prep_time: prepTimeNum,
            is_available: isAvailable,
            image_url: imageUrl,
          })
          .eq('id', editingItem.id)
          .select()
          .single();

        if (error) throw error;

        setMenuItems(prev => prev.map(item => 
          item.id === editingItem.id ? data : item
        ));

        toast({
          title: 'Item updated',
          description: 'Menu item has been updated',
        });
      } else {
        // Create new item
        const { data, error } = await supabase
          .from('shop_menu_items')
          .insert({
            shop_id: shopId,
            name,
            description: description || null,
            price: priceNum,
            category,
            prep_time: prepTimeNum,
            is_available: isAvailable,
            image_url: imageUrl,
          })
          .select()
          .single();

        if (error) throw error;

        setMenuItems(prev => [...prev, data]);

        toast({
          title: 'Item added',
          description: 'Menu item has been added',
        });
      }

      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving menu item:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save menu item',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (item: ShopMenuItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      const { error } = await supabase
        .from('shop_menu_items')
        .delete()
        .eq('id', itemToDelete.id);

      if (error) throw error;

      setMenuItems(prev => prev.filter(item => item.id !== itemToDelete.id));

      toast({
        title: 'Item deleted',
        description: 'Menu item has been removed',
      });
    } catch (error: any) {
      console.error('Error deleting menu item:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete menu item',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const toggleAvailability = async (item: ShopMenuItem) => {
    const newStatus = !item.is_available;

    const { error } = await supabase
      .from('shop_menu_items')
      .update({ is_available: newStatus })
      .eq('id', item.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update item status',
        variant: 'destructive',
      });
    } else {
      setMenuItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, is_available: newStatus } : i
      ));
    }
  };

  // Group items by category
  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ShopMenuItem[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Menu Items</CardTitle>
            <CardDescription>
              Add and manage your shop's menu items
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
                </DialogTitle>
                <DialogDescription>
                  {editingItem 
                    ? 'Update the details of this menu item' 
                    : 'Add a new item to your menu'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>Item Image (Optional)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  {imagePreview ? (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={removeImage}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Upload image</span>
                    </button>
                  )}
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="itemName">Item Name *</Label>
                  <Input
                    id="itemName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Chicken Biryani"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="itemDescription">Description</Label>
                  <Textarea
                    id="itemDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the item"
                    rows={2}
                  />
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <Label htmlFor="itemPrice">Price (₹) *</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="itemPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="itemCategory">Category *</Label>
                  <Input
                    id="itemCategory"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Main Course, Beverages, Snacks"
                    required
                  />
                </div>

                {/* Prep Time */}
                <div className="space-y-2">
                  <Label htmlFor="itemPrepTime">Prep Time (minutes)</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="itemPrepTime"
                      type="number"
                      min="1"
                      max="120"
                      value={prepTime}
                      onChange={(e) => setPrepTime(e.target.value)}
                      placeholder="10"
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Estimated time to prepare this item
                  </p>
                </div>

                {/* Availability */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="itemAvailable">Available for order</Label>
                  <Switch
                    id="itemAvailable"
                    checked={isAvailable}
                    onCheckedChange={setIsAvailable}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingItem ? (
                    'Update Item'
                  ) : (
                    'Add Item'
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {menuItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <UtensilsCrossed className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold">No Menu Items</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Add your first menu item to start showcasing your offerings to customers.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category}>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                  {category}
                </h3>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex gap-3 p-3 rounded-lg border ${
                        !item.is_available ? 'opacity-60 bg-muted/30' : 'bg-card'
                      }`}
                    >
                      {/* Item Image */}
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <UtensilsCrossed className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium truncate">{item.name}</h4>
                            {item.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {item.description}
                              </p>
                            )}
                            <p className="text-sm font-semibold text-primary mt-1">
                              ₹{item.price}
                            </p>
                          </div>
                          <Badge 
                            variant={item.is_available ? 'default' : 'secondary'}
                            className={item.is_available ? 'bg-green-500 hover:bg-green-600' : ''}
                          >
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </Badge>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-2">
                          <Switch
                            checked={item.is_available}
                            onCheckedChange={() => toggleAvailability(item)}
                            className="scale-75"
                          />
                          <span className="text-xs text-muted-foreground">
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </span>
                          <div className="flex-1" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(item)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => confirmDelete(item)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Menu Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}