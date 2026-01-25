import { Input } from "@/components/ui/input";
import { formatMacAddress, isMacAddressComplete } from "@/lib/formatUtils";
import { cn } from "@/lib/utils";

interface MacAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MacAddressInput({
  value,
  onChange,
  placeholder = "XX:XX:XX:XX:XX:XX",
  disabled = false,
  className = "",
}: MacAddressInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatMacAddress(e.target.value);
    onChange(formatted);
  };

  const isComplete = isMacAddressComplete(value);

  return (
    <Input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={17} // XX:XX:XX:XX:XX:XX = 17 chars
      className={cn(
        className,
        value && !isComplete && "border-amber-500 focus-visible:ring-amber-500"
      )}
    />
  );
}
