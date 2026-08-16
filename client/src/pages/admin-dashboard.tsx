import {useState, useMemo} from "react";
import {useAuth} from "@/hooks/use-auth";
import {
  Loader2,
  Users,
  TrendingUp,
  Eye,
  Search,
  Filter,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ExternalLink
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {useQuery} from "@tanstack/react-query";
// Removed AppShell and PageContainer imports to match other pages
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {Badge} from "@/components/ui/badge";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {apiRequest} from "@/lib/queryClient";
import {format} from "date-fns";

interface AdminStats {
  users: {
    totalUsers: number;
    betaUsers: number;
    premiumUsers: number;
    freeUsers: number;
    completedProfiles: number;
    usersWithCharacters: number;
  };
  headshots: {
    totalRequests: number;
    completedRequests: number;
    failedRequests: number;
    pendingRequests: number;
  };
  organizations: {
    totalOrganizations: number;
  };
  recentActivity: {
    newUsers: number;
    newHeadshots: number;
  };
}

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  title?: string;
  companyName?: string;
  organizationId?: number;
  organizationName?: string;
  publicPath: string;
  isBetaTester: boolean;
  planType: "free" | "pro";
  headshotCredits: number;
  onboardingComplete: boolean;
  selectedRole?: "creator" | "professional" | "team_member";
  characterId?: number;
  createdAt: string;
  updatedAt: string;
  headshotStats: {
    totalRequests: number;
    completedRequests: number;
  };
  hasCharacter: boolean;
  settings?: {
    sections?: Array<{
      id: string;
      type: string;
    }>;
  };
}

type SortField =
  | "name"
  | "email"
  | "company"
  | "type"
  | "plan"
  | "profile"
  | "headshots"
  | "character"
  | "joined";
type SortOrder = "asc" | "desc";

export default function AdminDashboard() {
  const {user} = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortField, setSortField] = useState<SortField>("joined");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const itemsPerPage = 50;

  // Fetch admin statistics
  const {data: stats, isLoading: statsLoading} = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user
  });

  // Fetch all users once (more efficient)
  const {
    data: allUsers,
    isLoading: usersLoading,
    error: usersError
  } = useQuery<User[]>({
    queryKey: ["/api/admin/users/all"],
    queryFn: async () => {
      console.log(
        "🚀 FRONTEND: Making API request to /api/admin/users?limit=1000"
      );
      console.log("🚀 FRONTEND: User object:", user);
      console.log("🚀 FRONTEND: User authenticated:", !!user);

      // First try a simple test endpoint
      try {
        console.log("🧪 FRONTEND: Testing admin test endpoint first...");
        const testResponse = await apiRequest("/api/admin/test");
        console.log("🧪 FRONTEND: Test endpoint response:", testResponse);
      } catch (testError) {
        console.error("🧪 FRONTEND: Test endpoint failed:", testError);
      }

      // apiRequest returns parsed data directly and throws on errors
      const data = await apiRequest("/api/admin/users?limit=1000");
      console.log(
        "🔍 API Response - First user org data:",
        data.users?.[0]
          ? {
              id: data.users[0].id,
              firstName: data.users[0].firstName,
              organizationId: data.users[0].organizationId,
              organizationName: data.users[0].organizationName,
              companyName: data.users[0].companyName,
              settings: data.users[0].settings ? "Present" : "Missing"
            }
          : "No users in response"
      );

      return data.users || []; // Ensure we return the users array
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000 // Keep in memory for 10 minutes
  });

  // Client-side filtering, searching, and sorting
  const filteredAndSortedUsers = useMemo(() => {
    if (!allUsers) {
      return [];
    }

    let filtered = [...allUsers];

    // Apply filter
    if (filterType === "beta") {
      filtered = filtered.filter((user) => user.isBetaTester);
    } else if (filterType === "regular") {
      filtered = filtered.filter(
        (user) => !user.isBetaTester && user.planType === "free"
      );
    } else if (filterType === "premium") {
      filtered = filtered.filter((user) => user.planType === "pro");
    }

    // Apply search
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (user) =>
          user.email?.toLowerCase().includes(searchLower) ||
          user.firstName?.toLowerCase().includes(searchLower) ||
          user.lastName?.toLowerCase().includes(searchLower) ||
          user.organizationName?.toLowerCase().includes(searchLower) ||
          user.companyName?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "name":
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "email":
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case "company":
          aValue = (a.organizationName || a.companyName || "").toLowerCase();
          bValue = (b.organizationName || b.companyName || "").toLowerCase();
          break;
        case "type":
          aValue = a.isBetaTester
            ? "beta"
            : a.planType === "pro"
              ? "premium"
              : "regular";
          bValue = b.isBetaTester
            ? "beta"
            : b.planType === "pro"
              ? "premium"
              : "regular";
          break;
        case "plan":
          aValue = a.planType;
          bValue = b.planType;
          break;
        case "profile":
          aValue = getProfileCompleteness(a).percentage;
          bValue = getProfileCompleteness(b).percentage;
          break;
        case "headshots":
          aValue = a.headshotStats.completedRequests;
          bValue = b.headshotStats.completedRequests;
          break;
        case "character":
          aValue = a.characterId ? 1 : 0;
          bValue = b.characterId ? 1 : 0;
          break;
        case "joined":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [allUsers, filterType, searchTerm, sortField, sortOrder]);

  // Client-side pagination
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setFilterType(value);
    setCurrentPage(1);
  };

  // More comprehensive profile completion check
  const getProfileCompleteness = (user: User) => {
    const criteria = [
      {
        key: "title",
        label: "Job Title",
        completed: !!user.title,
        value: user.title || "Not set"
      },
      {
        key: "company",
        label: "Company",
        completed: !!(user.organizationName || user.companyName),
        value: user.organizationName || user.companyName || "Not set"
      },
      {
        key: "sections",
        label: "Profile Sections",
        completed: !!(
          user.settings?.sections && user.settings.sections.length > 0
        ),
        value:
          user.settings?.sections && user.settings.sections.length > 0
            ? `${user.settings.sections.length} sections added`
            : "No sections added"
      },
      {
        key: "character",
        label: "AI Character",
        completed: !!user.characterId,
        value: user.characterId ? "Created" : "Not created"
      }
    ];

    const completedChecks = criteria.filter((c) => c.completed).length;
    const totalChecks = criteria.length;

    return {
      isComplete: completedChecks >= 3, // At least 3 out of 4 criteria
      percentage: Math.round((completedChecks / totalChecks) * 100),
      level:
        completedChecks >= 4
          ? "Complete"
          : completedChecks >= 3
            ? "Good"
            : completedChecks >= 2
              ? "Basic"
              : "Incomplete",
      criteria
    };
  };

  const getProfileTooltipContent = (user: User) => {
    const completeness = getProfileCompleteness(user);

    return (
      <div className="space-y-2 max-w-xs">
        <div className="font-medium text-sm">
          Profile Completion: {completeness.percentage}%
        </div>
        <div className="space-y-1">
          {completeness.criteria.map((criteria) => (
            <div
              key={criteria.key}
              className="flex items-start justify-between text-xs"
            >
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    criteria.completed ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="font-medium">{criteria.label}:</span>
              </div>
              <span
                className={`ml-2 ${
                  criteria.completed ? "text-green-600" : "text-red-600"
                }`}
              >
                {criteria.completed ? "✓" : "✗"}
              </span>
            </div>
          ))}
        </div>
        {completeness.level !== "Complete" && (
          <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
            {4 - completeness.criteria.filter((c) => c.completed).length} more{" "}
            {4 - completeness.criteria.filter((c) => c.completed).length === 1
              ? "item"
              : "items"}{" "}
            needed for completion
          </div>
        )}
      </div>
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new field with default order
      setSortField(field);
      setSortOrder(field === "joined" ? "desc" : "asc"); // Default newest first for dates
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4" />;
    }
    return sortOrder === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const exportUsers = async () => {
    try {
      // Use filtered and sorted users for export
      const usersToExport = filteredAndSortedUsers;

      // Convert to CSV
      const headers = [
        "ID",
        "Email",
        "Name",
        "Company",
        "Type",
        "Plan",
        "Profile Complete",
        "Headshots",
        "Created",
        "Public Profile"
      ];
      const csvData = usersToExport.map((user: User) => [
        user.id,
        user.email,
        `${user.firstName} ${user.lastName}`,
        user.organizationName || user.companyName || "",
        user.isBetaTester ? "Beta" : "Regular",
        user.planType,
        getProfileCompleteness(user).level,
        user.headshotStats.completedRequests,
        format(new Date(user.createdAt), "yyyy-MM-dd"),
        user.publicPath ? `${window.location.origin}/${user.publicPath}` : ""
      ]);

      const csvContent = [headers, ...csvData]
        .map((row) => row.join(","))
        .join("\n");
      const blob = new Blob([csvContent], {type: "text/csv"});
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const getUserTypeColor = (user: User) => {
    if (user.isBetaTester) return "bg-purple-100 text-purple-800";
    if (user.planType === "pro") return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  const getUserTypeLabel = (user: User) => {
    if (user.isBetaTester) return "Beta";
    if (user.planType === "pro") return "Premium";
    return "Free";
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-48px)]">
      <div className="flex flex-col border-2 sm:rounded-2xl h-full flex-grow bg-white">
        {/* Header */}
        <div className="py-3 px-4 flex flex-row items-center justify-between border-b-2">
          <div>
            <h2 className="text-lg font-medium">Admin Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Comprehensive user management and analytics for beta tracking
            </p>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col px-7 py-4 border-y-0 flex-grow">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="settings">System Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 flex-grow">
              {/* Stats Overview */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Users
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats?.users.totalUsers || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      +{stats?.recentActivity.newUsers || 0} this month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Beta Users
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats?.users.betaUsers || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stats?.users.totalUsers
                        ? Math.round(
                            (stats.users.betaUsers / stats.users.totalUsers) *
                              100
                          )
                        : 0}
                      % of total users
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Premium Users
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats?.users.premiumUsers || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stats?.users.totalUsers
                        ? Math.round(
                            (stats.users.premiumUsers /
                              stats.users.totalUsers) *
                              100
                          )
                        : 0}
                      % conversion rate
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Completed Profiles
                    </CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats?.users.completedProfiles || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stats?.users.totalUsers
                        ? Math.round(
                            (stats.users.completedProfiles /
                              stats.users.totalUsers) *
                              100
                          )
                        : 0}
                      % completion rate
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Headshot Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Headshot Generation Statistics</CardTitle>
                  <CardDescription>
                    Overview of AI headshot usage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {stats?.headshots.totalRequests || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Requests
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {stats?.headshots.completedRequests || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Completed
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {stats?.headshots.pendingRequests || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Pending
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {stats?.headshots.failedRequests || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Failed
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-6 flex-grow">
              {/* User Management Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Search, filter, and analyze user accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search users by name, email, or company..."
                          value={searchTerm}
                          onChange={(e) => handleSearch(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <Select
                      value={filterType}
                      onValueChange={handleFilterChange}
                    >
                      <SelectTrigger className="w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="beta">Beta Users</SelectItem>
                        <SelectItem value="premium">Premium Users</SelectItem>
                        <SelectItem value="regular">Free Users</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={exportUsers} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>

                  {/* Users Table */}
                  {usersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("name")}
                            >
                              <div className="flex items-center space-x-1">
                                <span>User</span>
                                {getSortIcon("name")}
                              </div>
                            </TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("company")}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Company</span>
                                {getSortIcon("company")}
                              </div>
                            </TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("type")}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Type</span>
                                {getSortIcon("type")}
                              </div>
                            </TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("plan")}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Plan</span>
                                {getSortIcon("plan")}
                              </div>
                            </TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("profile")}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Profile</span>
                                {getSortIcon("profile")}
                              </div>
                            </TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("headshots")}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Headshots</span>
                                {getSortIcon("headshots")}
                              </div>
                            </TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("character")}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Character</span>
                                {getSortIcon("character")}
                              </div>
                            </TableHead>
                            <TableHead
                              className="cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("joined")}
                            >
                              <div className="flex items-center space-x-1">
                                <span>Joined</span>
                                {getSortIcon("joined")}
                              </div>
                            </TableHead>
                            <TableHead>
                              <span>Public Profile</span>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedUsers.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={8}
                                className="text-center py-8"
                              >
                                <div className="text-muted-foreground">
                                  {usersLoading ? (
                                    <div className="flex items-center justify-center">
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      Loading users...
                                    </div>
                                  ) : usersError ? (
                                    <div className="text-sm text-red-600">
                                      Error loading users: {usersError.message}
                                    </div>
                                  ) : filteredAndSortedUsers.length === 0 &&
                                    allUsers &&
                                    allUsers.length > 0 ? (
                                    <>
                                      <div className="text-sm">
                                        No users match your current filters
                                      </div>
                                      <div className="text-xs mt-1">
                                        Try adjusting your search or filter
                                        criteria
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-sm">
                                        No users found
                                      </div>
                                      <div className="text-xs mt-1">
                                        {allUsers === undefined
                                          ? "Loading..."
                                          : "No users exist yet"}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedUsers.map((user: User) => (
                              <TableRow key={user.id}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">
                                      {user.firstName} {user.lastName}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {user.email}
                                    </div>
                                    {user.title && (
                                      <div className="text-xs text-muted-foreground">
                                        {user.title}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {user.organizationName ||
                                      user.companyName ||
                                      "—"}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={getUserTypeColor(user)}>
                                    {getUserTypeLabel(user)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      user.planType === "pro"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {user.planType.charAt(0).toUpperCase() +
                                      user.planType.slice(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="space-y-1 cursor-help">
                                          {(() => {
                                            const completeness =
                                              getProfileCompleteness(user);
                                            return (
                                              <>
                                                <Badge
                                                  variant={
                                                    completeness.level ===
                                                    "Complete"
                                                      ? "default"
                                                      : completeness.level ===
                                                          "Good"
                                                        ? "secondary"
                                                        : completeness.level ===
                                                            "Basic"
                                                          ? "outline"
                                                          : "destructive"
                                                  }
                                                >
                                                  {completeness.level}
                                                </Badge>
                                                <div className="text-xs text-muted-foreground">
                                                  {completeness.percentage}%
                                                </div>
                                              </>
                                            );
                                          })()}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="top"
                                        className="p-3"
                                      >
                                        {getProfileTooltipContent(user)}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <div>
                                      {user.headshotStats.completedRequests}{" "}
                                      completed
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {user.headshotStats.totalRequests} total
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      user.hasCharacter
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {user.hasCharacter ? "Created" : "None"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {format(
                                      new Date(user.createdAt),
                                      "MMM dd, yyyy"
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {user.publicPath ? (
                                    <a
                                      href={`/${user.publicPath}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                                    >
                                      View Profile
                                      <ExternalLink className="ml-1 h-3 w-3" />
                                    </a>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      No public path
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            Showing{" "}
                            {Math.min(
                              (currentPage - 1) * itemsPerPage + 1,
                              filteredAndSortedUsers.length
                            )}{" "}
                            to{" "}
                            {Math.min(
                              currentPage * itemsPerPage,
                              filteredAndSortedUsers.length
                            )}{" "}
                            of {filteredAndSortedUsers.length} users
                            {allUsers &&
                              filteredAndSortedUsers.length !==
                                allUsers.length && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  (filtered from {allUsers.length} total)
                                </span>
                              )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCurrentPage((prev) => Math.max(1, prev - 1))
                              }
                              disabled={currentPage === 1}
                            >
                              Previous
                            </Button>
                            <span className="text-sm">
                              Page {currentPage} of {totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCurrentPage((prev) =>
                                  Math.min(totalPages, prev + 1)
                                )
                              }
                              disabled={currentPage === totalPages}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>
                    Configure system-wide settings and model parameters
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    System settings have been moved to a dedicated admin panel.
                    <a
                      href="/super-admin"
                      className="text-primary hover:underline ml-1"
                    >
                      Access RenderNet Settings →
                    </a>
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
