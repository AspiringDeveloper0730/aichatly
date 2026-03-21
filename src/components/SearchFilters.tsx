
"use client";

import React, { memo } from "react";
import { Search, User, Users, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface SearchFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedGender: "all" | "male" | "female";
  onGenderChange: (gender: "all" | "male" | "female") => void;
  showAnimeOnly: boolean;
  onAnimeToggle: () => void;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  categories: Array<{ id: string; name_en: string; name_tr: string; slug: string }>;
}

export const SearchFilters = memo(function SearchFilters({
  searchQuery,
  onSearchChange,
  selectedGender,
  onGenderChange,
  showAnimeOnly,
  onAnimeToggle,
  selectedCategory,
  onCategoryChange,
  categories,
}: SearchFiltersProps) {
  const { t, language } = useLanguage();

  return (
    <div className="space-y-4 w-full mb-0 pb-0 md:mb-0 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center md:gap-3 w-full">
        <div className="relative w-full md:w-1/2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder={t("search.placeholder")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-12 h-14 rounded-xl border-2 focus:border-primary focus:glow-blue-purple transition-smooth text-base w-full"
          />
        </div>

        <div className="hidden md:flex md:gap-3 md:flex-1">
          <Button
            variant={selectedGender === "all" ? "default" : "outline"}
            size="lg"
            onClick={() => onGenderChange("all")}
            className={cn(
              "rounded-full transition-smooth hover:scale-105 h-11 px-6 flex-shrink-0",
              selectedGender === "all" && "gradient-blue-purple text-white glow-blue-purple"
            )}
          >
            <Users className="w-4 h-4 mr-2" />
            {t("search.all")}
          </Button>
          
          <Button
            variant={selectedGender === "male" ? "default" : "outline"}
            size="lg"
            onClick={() => onGenderChange("male")}
            className={cn(
              "rounded-full transition-smooth hover:scale-105 h-11 px-6 flex-shrink-0",
              selectedGender === "male" && "gradient-blue-purple text-white glow-blue-purple"
            )}
          >
            <User className="w-4 h-4 mr-2" />
            {t("search.male")}
          </Button>
          
          <Button
            variant={selectedGender === "female" ? "default" : "outline"}
            size="lg"
            onClick={() => onGenderChange("female")}
            className={cn(
              "rounded-full transition-smooth hover:scale-105 h-11 px-6 flex-shrink-0",
              selectedGender === "female" && "gradient-blue-purple text-white glow-blue-purple"
            )}
          >
            <User className="w-4 h-4 mr-2" />
            {t("search.female")}
          </Button>
          
          <Button
            variant={showAnimeOnly ? "default" : "outline"}
            size="lg"
            onClick={onAnimeToggle}
            className={cn(
              "rounded-full transition-smooth hover:scale-105 h-11 px-6 flex-shrink-0",
              showAnimeOnly && "gradient-blue-purple text-white glow-blue-purple"
            )}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {t("search.anime")}
          </Button>
        </div>
      </div>

      <div className="w-full overflow-x-auto -mx-4 px-4 py-2 md:hidden">
        <div className="flex gap-3 min-w-max">
          <Button
            variant={selectedGender === "all" ? "default" : "outline"}
            size="lg"
            onClick={() => onGenderChange("all")}
            className={cn(
              "rounded-full transition-smooth hover:scale-105 h-11 px-6 flex-shrink-0",
              selectedGender === "all" && "gradient-blue-purple text-white glow-blue-purple"
            )}
          >
            <Users className="w-4 h-4 mr-2" />
            {t("search.all")}
          </Button>
          
          <Button
            variant={selectedGender === "male" ? "default" : "outline"}
            size="lg"
            onClick={() => onGenderChange("male")}
            className={cn(
              "rounded-full transition-smooth hover:scale-105 h-11 px-6 flex-shrink-0",
              selectedGender === "male" && "gradient-blue-purple text-white glow-blue-purple"
            )}
          >
            <User className="w-4 h-4 mr-2" />
            {t("search.male")}
          </Button>
          
          <Button
            variant={selectedGender === "female" ? "default" : "outline"}
            size="lg"
            onClick={() => onGenderChange("female")}
            className={cn(
              "rounded-full transition-smooth hover:scale-105 h-11 px-6 flex-shrink-0",
              selectedGender === "female" && "gradient-blue-purple text-white glow-blue-purple"
            )}
          >
            <User className="w-4 h-4 mr-2" />
            {t("search.female")}
          </Button>
          
          <Button
            variant={showAnimeOnly ? "default" : "outline"}
            size="lg"
            onClick={onAnimeToggle}
            className={cn(
              "rounded-full transition-smooth hover:scale-105 h-11 px-6 flex-shrink-0",
              showAnimeOnly && "gradient-blue-purple text-white glow-blue-purple"
            )}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {t("search.anime")}
          </Button>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="w-full overflow-x-auto -mx-4 px-4 pt-1 pb-2 mb-0 md:mb-0">
          <div className="flex gap-2 min-w-max mb-0 pb-0 md:mb-0 md:pb-0">
            {categories.map((category) => {
              const categoryName = language === "tr" ? category.name_tr : category.name_en;
              const isActive = selectedCategory === category.id;
              
              return (
                <Button
                  key={category.id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => onCategoryChange(isActive ? null : category.id)}
                  className={cn(
                    "rounded-full whitespace-nowrap transition-smooth hover:scale-105 h-9 px-4 flex-shrink-0",
                    isActive && "gradient-blue-purple text-white glow-blue-purple"
                  )}
                >
                  {categoryName}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
