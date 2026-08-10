import { useState } from "react";
import { Scissors, Package, Tag, Percent, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ITEM_TYPES = [
  { value: "service", label: "Serviço", icon: Scissors, desc: "Corte, barba, manicure..." },
  { value: "product", label: "Produto", icon: Package, desc: "Shampoo, pomada, condicionador..." },
];

const CATEGORIES = [
  { value: "corte",