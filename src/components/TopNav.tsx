import { TreePine } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "대시보드", url: "/" },
  { title: "수목 재고", url: "/tree-inventory" },
  { title: "방제 달력", url: "/pest-calendar" },
  { title: "프로젝트", url: "/projects" },
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <TreePine className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold">스마트 수목 관리</h1>
              <p className="text-xs text-muted-foreground">이천시</p>
            </div>
          </div>
          
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                end
                className={({ isActive }) =>
                  cn(
                    "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )
                }
              >
                {item.title}
              </NavLink>
            ))}
          </nav>
        </div>
        
        <div className="text-right">
          <p className="text-sm font-medium">김철수 주무관</p>
          <p className="text-xs text-muted-foreground">이천시</p>
        </div>
      </div>
    </header>
  );
}
