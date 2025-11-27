import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface EnhancedDatePickerProps {
  value?: Date
  onValueChange: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function EnhancedDatePicker({
  value,
  onValueChange,
  placeholder = "Pick a date",
  className,
  disabled,
}: EnhancedDatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value)
  const [currentMonth, setCurrentMonth] = React.useState(value?.getMonth() ?? new Date().getMonth())
  const [currentYear, setCurrentYear] = React.useState(value?.getFullYear() ?? new Date().getFullYear())
  const [manualInput, setManualInput] = React.useState("")

  React.useEffect(() => {
    setSelectedDate(value)
    if (value) {
      setCurrentMonth(value.getMonth())
      setCurrentYear(value.getFullYear())
    }
  }, [value])

  const handleTodayClick = () => {
    const today = new Date()
    setSelectedDate(today)
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
    onValueChange(today)
    setIsOpen(false)
  }

  const handleManualInput = (input: string) => {
    setManualInput(input)
    // Try to parse MM/DD/YYYY format
    const match = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (match) {
      const [, month, day, year] = match
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      if (!isNaN(date.getTime())) {
        setSelectedDate(date)
        setCurrentMonth(date.getMonth())
        setCurrentYear(date.getFullYear())
        onValueChange(date)
      }
    }
  }

  const handleMonthChange = (month: string) => {
    setCurrentMonth(parseInt(month))
  }

  const handleYearChange = (year: string) => {
    setCurrentYear(parseInt(year))
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const handleDayClick = (day: number) => {
    const date = new Date(currentYear, currentMonth, day)
    setSelectedDate(date)
    onValueChange(date)
    setIsOpen(false)
  }

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay()
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear)
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
    const days = []

    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2" />)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = 
        selectedDate &&
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === currentMonth &&
        selectedDate.getFullYear() === currentYear

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDayClick(day)}
          className={cn(
            "p-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
            isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
          )}
        >
          {day}
        </button>
      )
    }

    return days
  }

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ]

  const fullMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const years = Array.from({ length: 105 }, (_, i) => new Date().getFullYear() + 10 - i)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 bg-background z-50" align="start">
        <div className="space-y-4 pointer-events-auto">
          {/* Today Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTodayClick}
            className="w-full"
          >
            Today
          </Button>

          {/* Manual Input */}
          <Input
            placeholder="MM/DD/YYYY"
            value={manualInput}
            onChange={(e) => handleManualInput(e.target.value)}
            className="text-center"
          />

          {/* Month/Year Dropdowns and Navigation */}
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex gap-2 flex-1">
              <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
                <SelectTrigger className="flex-1">
                  <SelectValue>{months[currentMonth]}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {fullMonths.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={currentYear.toString()} onValueChange={handleYearChange}>
                <SelectTrigger className="flex-1">
                  <SelectValue>{currentYear}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[200px] bg-background z-50">
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {renderCalendarDays()}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
