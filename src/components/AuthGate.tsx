import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, Building2, Lock, LogIn, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getOrganizationTypeLabel } from "@/lib/organizations";
import { supabase, type AppRole } from "@/lib/supabase";

interface SignupOrganization {
  id: string;
  name: string;
  organization_type: string;
}

interface AuthGateProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

export function AuthGate({ children, allowedRoles }: AuthGateProps) {
  const { user, role, isSystemAdmin, loading, isConfigured, signIn, signOut, signUp } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [organizationMode, setOrganizationMode] = useState<"existing" | "new">("existing");
  const [organizationSearch, setOrganizationSearch] = useState("");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [requestedOrganizationName, setRequestedOrganizationName] = useState("");
  const [organizations, setOrganizations] = useState<SignupOrganization[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    const loadOrganizations = async () => {
      setLoadingOrganizations(true);
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, organization_type")
        .order("name", { ascending: true });
      setLoadingOrganizations(false);

      if (error) {
        return;
      }

      setOrganizations((data ?? []) as SignupOrganization[]);
    };

    void loadOrganizations();
  }, []);

  const filteredOrganizations = useMemo(() => {
    if (!organizationSearch.trim()) return organizations.slice(0, 8);
    const keyword = organizationSearch.trim().toLowerCase();
    return organizations
      .filter((organization) => organization.name.toLowerCase().includes(keyword))
      .slice(0, 8);
  }, [organizationSearch, organizations]);

  const handleSignIn = async () => {
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);

    if (result.error) {
      toast({
        title: "로그인 실패",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "로그인 완료",
      description: "세션을 불러왔습니다.",
    });
  };

  const handleSignUp = async () => {
    if (organizationMode === "existing" && !selectedOrganizationId) {
      toast({
        title: "기관 선택 필요",
        description: "기존 기관으로 가입하려면 검색 결과에서 기관을 선택해 주세요.",
        variant: "destructive",
      });
      return;
    }

    if (organizationMode === "new" && !requestedOrganizationName.trim()) {
      toast({
        title: "기관명 입력 필요",
        description: "신규 기관으로 가입하려면 기관명을 입력해 주세요.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const result = await signUp({
      email,
      password,
      fullName,
      organizationMode,
      organizationId: organizationMode === "existing" ? selectedOrganizationId : undefined,
      requestedOrganizationName: organizationMode === "new" ? requestedOrganizationName : undefined,
    });
    setSubmitting(false);

    if (result.error) {
      toast({
        title: "회원가입 실패",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "회원가입 요청 완료",
      description: result.message,
    });
    setActiveTab("signin");
  };

  if (!isConfigured) {
    return (
      <div className="container mx-auto px-6 py-10">
        <Card className="mx-auto max-w-xl border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Supabase 환경변수가 비어 있습니다
            </CardTitle>
            <CardDescription>
              `.env.local` 또는 `.env.example`의 Supabase URL과 publishable key를 확인해 주세요.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-10">
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle>인증 상태 확인 중</CardTitle>
            <CardDescription>Supabase 세션과 사용자 권한을 불러오고 있습니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center px-6 py-10">
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              로그인
            </CardTitle>
            <CardDescription>회원가입 신청 시 기관 연결 정보를 함께 받고, 이후 기관 담당자 또는 어드민이 승인합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">로그인</TabsTrigger>
                <TabsTrigger value="signup">회원가입</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">이메일</Label>
                  <Input id="signin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">비밀번호</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={handleSignIn} disabled={submitting}>
                  <LogIn className="h-4 w-4" />
                  로그인
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">이름</Label>
                  <Input id="signup-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>기관 연결 방식</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={organizationMode === "existing" ? "default" : "outline"}
                      onClick={() => setOrganizationMode("existing")}
                    >
                      기존 기관
                    </Button>
                    <Button
                      type="button"
                      variant={organizationMode === "new" ? "default" : "outline"}
                      onClick={() => setOrganizationMode("new")}
                    >
                      새 기관 생성
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-org-search">
                    {organizationMode === "existing" ? "기존 기관 검색" : "신규 기관명"}
                  </Label>
                  {organizationMode === "existing" ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-org-search"
                          value={organizationSearch}
                          onChange={(e) => setOrganizationSearch(e.target.value)}
                          placeholder="기관명을 검색하세요"
                          className="pl-9"
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto rounded-md border">
                        {loadingOrganizations ? (
                          <div className="p-3 text-sm text-muted-foreground">기관 목록을 불러오는 중입니다.</div>
                        ) : filteredOrganizations.length > 0 ? (
                          filteredOrganizations.map((organization) => (
                            <button
                              key={organization.id}
                              type="button"
                              onClick={() => setSelectedOrganizationId(organization.id)}
                              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                                selectedOrganizationId === organization.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                              }`}
                            >
                              <span>{organization.name}</span>
                              <span className="text-xs opacity-70">{getOrganizationTypeLabel(organization.organization_type)}</span>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-sm text-muted-foreground">검색된 기관이 없습니다.</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <Input
                      id="signup-org-search"
                      value={requestedOrganizationName}
                      onChange={(e) => setRequestedOrganizationName(e.target.value)}
                      placeholder="예: OO도시수목관리센터"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">이메일</Label>
                  <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">비밀번호</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Building2 className="mt-0.5 h-4 w-4" />
                    <p>기존 기관을 선택하면 가입 신청이 해당 기관 승인 대기 상태로 저장됩니다. 신규 기관은 이름만 받고 추후 검토합니다.</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  가입 즉시 기관 멤버가 되는 것이 아니라, 기관 담당자 또는 어드민 승인 후 활성화됩니다.
                </p>
                <Button className="w-full" onClick={handleSignUp} disabled={submitting}>
                  회원가입
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (allowedRoles && role && !isSystemAdmin && !allowedRoles.includes(role)) {
    return (
      <div className="container mx-auto px-6 py-10">
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              권한이 부족합니다
            </CardTitle>
            <CardDescription>
              현재 계정 권한은 `{role}` 입니다. 이 화면은 `{allowedRoles.join(", ")}` 권한만 접근할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void signOut()}>
              로그아웃
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
