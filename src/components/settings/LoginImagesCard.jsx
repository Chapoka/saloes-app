import { useState, useEffect } from "react";
import { db } from "@/api/dbClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2, Loader2, ImageIcon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const SETTINGS_KEY = "login_carousel_images";

export default function LoginImagesCard() {
  const queryClient = useQueryClient();
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: () => db.entities.Settings.list(),
  });

  useEffect(() => {
    const entry = settings.find(s => s.key === SETTINGS_KEY);
    if (entry) {
      try {
        const parsed = JSON.parse(entry.value);
        if (Array.isArray(parsed)) setImages(parsed);
      } catch { /* ignore */ }
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (newImages) => {
      const entry = settings.find(s => s.key === SETTINGS_KEY);
      const value = JSON.stringify(newImages);
      if (entry) {
        await db.entities.Settings.update(entry.id, { value });
      } else {
        await db.entities.Settings.create({ key: SETTINGS_KEY, value });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Fotos da entrada salvas!");
    },
    onError: (err) => toast.error(err.message || "Erro ao salvar"),
  });

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const { file_url } = await db.integrations.Core.UploadFile({ file });
        uploaded.push({ image: file_url, title: "", subtitle: "" });
      }
      const newImages = [...images, ...uploaded];
      setImages(newImages);
      saveMutation.mutate(newImages);
    } catch (err) {
      toast.error(err.message || "Erro no upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = (idx) => {
    const newImages = images.filter((_, i) => i !== idx);
    setImages(newImages);
    saveMutation.mutate(newImages);
  };

  const handleChange = (idx, field, value) => {
    setImages(prev => prev.map((img, i) => i === idx ? { ...img, [field]: value } : img));
  };

  const handleSaveTexts = () => {
    saveMutation.mutate(images);
  };

  return (
    <Card className="rounded-2xl shadow-sm border border-gray-100">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-pink-100">
            <ImageIcon className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Fotos da Tela de Entrada</CardTitle>
            <CardDescription>Imagens exibidas no carrossel da tela de login</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <label className="cursor-pointer">
            <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 transition-colors">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              {uploading ? "Enviando..." : "Adicionar Fotos"}
            </span>
          </label>
          <p className="text-xs text-gray-500">Formatos: JPG, PNG. Você pode selecionar várias de uma vez.</p>
        </div>

        {images.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-xl">
            Nenhuma foto cadastrada. A tela de login usará as imagens padrão.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {images.map((img, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
              <div className="relative h-32 bg-gray-200">
                <img src={img.image} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => handleRemove(idx)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 space-y-2">
                <div>
                  <Label className="text-xs text-gray-500">Título</Label>
                  <Input
                    value={img.title || ""}
                    onChange={e => handleChange(idx, "title", e.target.value)}
                    placeholder="Título exibido sobre a foto"
                    className="h-8 text-sm rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Subtítulo</Label>
                  <Input
                    value={img.subtitle || ""}
                    onChange={e => handleChange(idx, "subtitle", e.target.value)}
                    placeholder="Texto de apoio"
                    className="h-8 text-sm rounded-lg"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {images.length > 0 && (
          <div className="flex justify-end">
            <Button onClick={handleSaveTexts} disabled={saveMutation.isPending} className="rounded-xl bg-pink-600 hover:bg-pink-700">
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Salvando..." : "Salvar Textos"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}