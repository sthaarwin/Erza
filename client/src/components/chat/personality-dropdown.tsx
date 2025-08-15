import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Palette, RotateCcw } from "lucide-react";

interface PersonalityOption {
  value: string;
  label: string;
  icon: string;
}

interface PersonalityDropdownProps {
  currentPersonality: string;
  personalities: PersonalityOption[];
  onPersonalityChange: (personality: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function PersonalityDropdown({
  currentPersonality,
  personalities,
  onPersonalityChange,
  isOpen,
  onToggle,
}: PersonalityDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onToggle]);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="p-2 text-ctp-overlay1 hover:text-ctp-text hover:bg-ctp-surface0"
        data-testid="button-toggle-personality"
      >
        <Palette size={16} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-12 bg-ctp-surface0 border border-ctp-surface1 rounded-lg shadow-lg p-2 min-w-48 z-20">
          <div className="text-xs text-ctp-overlay0 mb-2 px-2">Quick Switch</div>
          
          {personalities.map((personality) => (
            <Button
              key={personality.value}
              variant="ghost"
              size="sm"
              onClick={() => onPersonalityChange(personality.value)}
              className={`w-full justify-start px-3 py-2 text-sm transition-colors ${
                currentPersonality === personality.value
                  ? "bg-ctp-surface1 text-ctp-text"
                  : "text-ctp-subtext1 hover:bg-ctp-surface1 hover:text-ctp-text"
              }`}
              data-testid={`button-personality-${personality.value}`}
            >
              <span className="mr-2">{personality.icon}</span>
              {personality.label}
            </Button>
          ))}
          
          <hr className="border-ctp-surface1 my-2" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPersonalityChange("friendly")}
            className="w-full justify-start px-3 py-2 text-sm text-ctp-overlay0 hover:bg-ctp-surface1 hover:text-ctp-subtext1"
            data-testid="button-reset-personality"
          >
            <RotateCcw size={16} className="mr-2" />
            Reset to Default
          </Button>
        </div>
      )}
    </div>
  );
}