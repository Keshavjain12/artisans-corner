import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import ImageUploader from '../../components/ImageUploader.jsx';
import { Button, Field, Input, PageHeader, Select, Spinner, Textarea } from '../../components/ui.jsx';
import vendorService from '../../services/vendorService.js';
import catalogService from '../../services/catalogService.js';
import useAsync from '../../hooks/useAsync.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  useDocumentTitle(isEdit ? 'Edit product' : 'Add product');

  const [images, setImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const categories = useAsync(() => catalogService.listCategories(), []);
  const existing = useAsync(
    () => (isEdit ? vendorService.getProduct(id) : Promise.resolve(null)),
    [id]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
      price: '',
      compareAtPrice: '',
      category: '',
      stock: 0,
      sku: '',
      tags: '',
      isActive: true,
    },
  });

  // Populate the form once the product being edited has loaded.
  useEffect(() => {
    const product = existing.data?.data?.product;
    if (!product) return;
    reset({
      name: product.name,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? '',
      category: product.category,
      stock: product.stock,
      sku: product.sku || '',
      tags: (product.tags || []).join(', '),
      isActive: product.isActive,
    });
    setImages(product.images || []);
  }, [existing.data, reset]);

  const onSubmit = async (values) => {
    if (images.length === 0) {
      toast.error('Add at least one photo of your piece');
      return;
    }

    const payload = {
      name: values.name,
      description: values.description,
      price: Number(values.price),
      compareAtPrice: values.compareAtPrice === '' ? null : Number(values.compareAtPrice),
      category: values.category,
      stock: Number(values.stock),
      sku: values.sku,
      isActive: Boolean(values.isActive),
      tags: String(values.tags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12),
      images: images.map((image) => ({
        url: image.url,
        publicId: image.publicId || '',
        alt: image.alt || values.name,
      })),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await vendorService.updateProduct(id, payload);
        toast.success('Product updated');
      } else {
        await vendorService.createProduct(payload);
        toast.success('Product listed');
      }
      navigate('/dashboard/seller/products');
    } catch (error) {
      toast.error(error.message);
      (error.fieldErrors || []).forEach((issue) => toast.error(`${issue.field}: ${issue.message}`));
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && existing.loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading product" />
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/dashboard/seller/products"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-clay-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to products
      </Link>

      <PageHeader
        className="mt-4"
        title={isEdit ? 'Edit product' : 'Add a product'}
        subtitle={
          isEdit
            ? 'Changes appear on the marketplace immediately. Past orders keep their original prices.'
            : 'Photos first - shoppers decide on the image, then read the story.'
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-6 xl:grid-cols-3" noValidate>
        <div className="space-y-6 xl:col-span-2">
          <div className="card space-y-4 p-6">
            <h2 className="text-sm font-semibold text-ink">Details</h2>

            <Field label="Product name" id="name" required error={errors.name?.message}>
              {({ id: fieldId, invalid }) => (
                <Input
                  id={fieldId}
                  invalid={invalid}
                  placeholder="Hand-Painted Ceramic Vase"
                  {...register('name', {
                    required: 'Give your piece a name',
                    minLength: { value: 3, message: 'Use at least 3 characters' },
                  })}
                />
              )}
            </Field>

            <Field
              label="Description"
              id="description"
              required
              error={errors.description?.message}
              hint="At least 20 characters - materials, size, how it is made"
            >
              {({ id: fieldId, invalid, describedBy }) => (
                <Textarea
                  id={fieldId}
                  rows={7}
                  invalid={invalid}
                  aria-describedby={describedBy}
                  {...register('description', {
                    required: 'Describe your piece',
                    minLength: { value: 20, message: 'Please write at least 20 characters' },
                  })}
                />
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" id="category" required error={errors.category?.message}>
                {({ id: fieldId, invalid }) => (
                  <Select
                    id={fieldId}
                    invalid={invalid}
                    {...register('category', { required: 'Choose a category' })}
                  >
                    <option value="">Select a category</option>
                    {(categories.data?.data || []).map((category) => (
                      <option key={category.slug} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label="SKU" id="sku" hint="Your own reference (optional)">
                {({ id: fieldId }) => <Input id={fieldId} {...register('sku')} />}
              </Field>
            </div>

            <Field label="Tags" id="tags" hint="Comma separated, up to 12 - helps shoppers find you">
              {({ id: fieldId }) => (
                <Input id={fieldId} placeholder="vase, ceramic, hand-painted" {...register('tags')} />
              )}
            </Field>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-semibold text-ink">Photos</h2>
            <p className="mb-4 mt-1 text-xs text-ink-soft">
              Uploaded straight to our image CDN - only the URL is stored on the product.
            </p>
            <ImageUploader images={images} onChange={setImages} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="card space-y-4 p-6">
            <h2 className="text-sm font-semibold text-ink">Pricing &amp; stock</h2>

            <Field label="Price (USD)" id="price" required error={errors.price?.message}>
              {({ id: fieldId, invalid }) => (
                <Input
                  id={fieldId}
                  type="number"
                  step="0.01"
                  min="0.01"
                  invalid={invalid}
                  {...register('price', {
                    required: 'Set a price',
                    min: { value: 0.01, message: 'Price must be greater than 0' },
                  })}
                />
              )}
            </Field>

            <Field
              label="Compare-at price"
              id="compareAtPrice"
              hint="Optional - shows as a struck-through original"
            >
              {({ id: fieldId }) => (
                <Input id={fieldId} type="number" step="0.01" min="0" {...register('compareAtPrice')} />
              )}
            </Field>

            <Field label="Stock" id="stock" required error={errors.stock?.message}>
              {({ id: fieldId, invalid }) => (
                <Input
                  id={fieldId}
                  type="number"
                  min="0"
                  step="1"
                  invalid={invalid}
                  {...register('stock', {
                    required: 'Set how many you have',
                    min: { value: 0, message: 'Stock cannot be negative' },
                  })}
                />
              )}
            </Field>

            <label className="flex items-center gap-2.5 text-sm text-ink-muted">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-sand text-clay-600 focus:ring-clay-400"
                {...register('isActive')}
              />
              Visible on the marketplace
            </label>
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1 py-3" loading={saving}>
              {isEdit ? 'Save changes' : 'Publish product'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/dashboard/seller/products')}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
