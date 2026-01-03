import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Settings, Calendar } from "lucide-react";
import { format } from "date-fns";

interface WelcomeHeaderProps {
  pendingCount: number;
  onNotificationsClick: () => void;
  isEditMode: boolean;
  onEditModeToggle: () => void;
}

const WelcomeHeader = ({ 
  pendingCount, 
  onNotificationsClick, 
  isEditMode, 
  onEditModeToggle 
}: WelcomeHeaderProps) => {
  const [greeting, setGreeting] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good morning");
    } else if (hour < 17) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
    }

    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
      <div className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          {greeting} 👋
        </h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <p className="text-sm">
            {format(currentDate, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="relative"
          onClick={onNotificationsClick}
        >
          <Bell className="w-5 h-5" />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium animate-pulse">
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          )}
        </Button>
        
        <Button
          variant={isEditMode ? "default" : "outline"}
          size="sm"
          onClick={onEditModeToggle}
          className="gap-2"
        >
          <Settings className={`w-4 h-4 ${isEditMode ? "animate-spin" : ""}`} />
          {isEditMode ? "Save Layout" : "Customize"}
        </Button>
      </div>
    </div>
  );
};

export default WelcomeHeader;