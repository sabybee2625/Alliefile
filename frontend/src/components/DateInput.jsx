import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { format, parse, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '../lib/utils';

// Generate year options (100 years back from now)
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 101 }, (_, i) => currentYear - 100 + i).reverse();

const months = [
  { value: 0, label: 'Janvier' },
  { value: 1, label: 'Février' },
  { value: 2, label: 'Mars' },
  { value: 3, label: 'Avril' },
  { value: 4, label: 'Mai' },
  { value: 5, label: 'Juin' },
  { value: 6, label: 'Juillet' },
  { value: 7, label: 'Août' },
  { value: 8, label: 'Septembre' },
  { value: 9, label: 'Octobre' },
  { value: 10, label: 'Novembre' },
  { value: 11, label: 'Décembre' },
];

export const DateInput = ({
  value,
  onChange,
  placeholder = 'JJ/MM/AAAA',
  allowUnknown = true,
  className,
}) => {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isUnknown, setIsUnknown] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(new Date());
  const inputRef = useRef(null);

  // Sync input value with external value
  useEffect(() => {
    if (value === null || value === undefined || value === '') {
      setInputValue('');
      setIsUnknown(value === null);
    } else {
      try {
        const date = new Date(value);
        if (isValid(date)) {
          setInputValue(format(date, 'dd/MM/yyyy'));
          setDisplayMonth(date);
          setIsUnknown(false);
        }
      } catch {
        setInputValue('');
      }
    }
  }, [value]);

  // Parse input string to date
  const parseInputDate = (str) => {
    // Try various formats
    const cleanStr = str.trim();
    
    // Format JJ/MM/AAAA
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleanStr)) {
      const parsed = parse(cleanStr, 'dd/MM/yyyy', new Date());
      if (isValid(parsed)) return parsed;
    }
    
    // Format JJ-MM-AAAA
    if (/^\d{2}-\d{2}-\d{4}$/.test(cleanStr)) {
      const parsed = parse(cleanStr, 'dd-MM-yyyy', new Date());
      if (isValid(parsed)) return parsed;
    }
    
    // Format AAAA-MM-JJ (ISO)
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      const parsed = new Date(cleanStr);
      if (isValid(parsed)) return parsed;
    }
    
    return null;
  };

  const handleInputChange = (e) => {
    let val = e.target.value;
    
    // Auto-format: add slashes automatically
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 2) {
      val = digits;
    } else if (digits.length <= 4) {
      val = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      val = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }
    
    setInputValue(val);
    
    // Try to parse
    const parsed = parseInputDate(val);
    if (parsed && isValid(parsed)) {
      onChange(format(parsed, 'yyyy-MM-dd'));
      setDisplayMonth(parsed);
    }
  };

  const handleInputBlur = () => {
    // Validate on blur
    if (inputValue && !isUnknown) {
      const parsed = parseInputDate(inputValue);
      if (parsed && isValid(parsed)) {
        setInputValue(format(parsed, 'dd/MM/yyyy'));
        onChange(format(parsed, 'yyyy-MM-dd'));
      } else {
        // Invalid input, clear or show error
        if (value) {
          setInputValue(format(new Date(value), 'dd/MM/yyyy'));
        } else {
          setInputValue('');
        }
      }
    }
  };

  const handleCalendarSelect = (date) => {
    if (date) {
      const formatted = format(date, 'yyyy-MM-dd');
      onChange(formatted);
      setInputValue(format(date, 'dd/MM/yyyy'));
      setIsUnknown(false);
    }
    setCalendarOpen(false);
  };

  const handleUnknownChange = (checked) => {
    setIsUnknown(checked);
    if (checked) {
      onChange(null);
      setInputValue('');
    }
  };

  const handleYearChange = (year) => {
    const newDate = new Date(displayMonth);
    newDate.setFullYear(parseInt(year));
    setDisplayMonth(newDate);
  };

  const handleMonthChange = (month) => {
    const newDate = new Date(displayMonth);
    newDate.setMonth(parseInt(month));
    setDisplayMonth(newDate);
  };

  const clearDate = () => {
    onChange('');
    setInputValue('');
    setIsUnknown(false);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-2">
        {/* Text input for keyboard entry */}
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            disabled={isUnknown}
            className={cn(
              'rounded-sm pr-8',
              isUnknown && 'bg-slate-100 text-slate-400'
            )}
            data-testid="date-input-text"
          />
          {inputValue && !isUnknown && (
            <button
              type="button"
              onClick={clearDate}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Calendar button */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="rounded-sm px-3"
              disabled={isUnknown}
              data-testid="date-calendar-btn"
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            {/* Year/Month selectors */}
            <div className="p-3 border-b flex gap-2">
              <Select
                value={displayMonth.getMonth().toString()}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="flex-1 h-8 text-sm rounded-sm" data-testid="date-month-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select
                value={displayMonth.getFullYear().toString()}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="w-24 h-8 text-sm rounded-sm" data-testid="date-year-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Calendar
              mode="single"
              selected={value ? new Date(value) : undefined}
              onSelect={handleCalendarSelect}
              month={displayMonth}
              onMonthChange={setDisplayMonth}
              locale={fr}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* "Date inconnue" checkbox */}
      {allowUnknown && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="date-unknown"
            checked={isUnknown}
            onCheckedChange={handleUnknownChange}
            data-testid="date-unknown-checkbox"
          />
          <Label
            htmlFor="date-unknown"
            className="text-sm text-slate-600 cursor-pointer"
          >
            Date inconnue
          </Label>
        </div>
      )}
    </div>
  );
};
