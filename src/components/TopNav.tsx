import { useState } from "react";
import { TreePine, ChevronDown } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const SUB_MENU_ITEMS = [
  { title: "수목위험도", url: "/tree-risk" },
  { title: "방제 달력",  url: "/pest-calendar" },
  { title: "토양 관리",  url: "/soil-management" },
];

const SUB_URLS = SUB_MENU_ITEMS.map((i) => i.url);

const TOP_NAV_ITEMS = [
  { title: "수목 지도", url: "/tree-inventory" },
  { title: "대시보드",  url: "/dashboard" },
];

export function TopNav() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const isSubActive = SUB_URLS.some((u) => location.pathname === u);

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
            {/* 수목 지도, 대시보드 */}
            {TOP_NAV_ITEMS.map((item) => (
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

            {/* 수목 관리 드롭다운 */}
            <div
              className="relative"
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <button
                data-testid="nav-tree-management"
                className={cn(
                  "flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  isSubActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                수목 관리
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-150",
                    dropdownOpen && "rotate-180"
                  )}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 top-full pt-1 z-50">
                  <div className="min-w-[130px] rounded-xl border bg-background shadow-lg py-1">
                    {SUB_MENU_ITEMS.map((item) => (
                      <NavLink
                        key={item.url}
                        to={item.url}
                        end
                        className={({ isActive }) =>
                          cn(
                            "block px-4 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-accent text-accent-foreground"
                              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                          )
                        }
                        onClick={() => setDropdownOpen(false)}
                      >
                        {item.title}
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 프로젝트 */}
            <NavLink
              to="/projects"
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
              프로젝트
            </NavLink>
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
