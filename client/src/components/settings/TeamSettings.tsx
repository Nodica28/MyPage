import React, {useState} from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {Button} from "@/components/ui/button";
import {Avatar, AvatarImage, AvatarFallback} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {Checkbox} from "@/components/ui/checkbox";
import {Input} from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {Skeleton} from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Pencil,
  Search,
  Loader2,
  RotateCcw
} from "lucide-react";
import {
  useCurrentOrganization,
  useCurrentOrganizationRole
} from "@/hooks/use-organizations";
import {useSendInvitations} from "@/hooks/use-invitations";
import {useToast} from "@/hooks/use-toast";
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {apiRequest} from "@/lib/queryClient";
import {cn} from "@/lib/utils";

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
  role: "Company Admin" | "User";
  status: "Active" | "Invited" | "Inactive";
  invitedAt?: string;
  joinedAt?: string;
}

type SortField = "name" | "role" | "status";
type SortOrder = "asc" | "desc";

const TeamSettings: React.FC = () => {
  const {toast} = useToast();
  const queryClient = useQueryClient();
  const {data: organization} = useCurrentOrganization();
  const {data: organizationRole} = useCurrentOrganizationRole();
  const sendInvitations = useSendInvitations();

  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set()
  );
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"Company Admin" | "User">(
    "User"
  );
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  const itemsPerPage = 10;
  const isCompanyAdmin = organizationRole?.isCompanyAdmin === true;

  // Fetch all team members (without search parameter)
  const {data: allMembersData, isLoading: isLoadingMembers} = useQuery<
    TeamMember[]
  >({
    queryKey: ["/api/team/members"],
    queryFn: async () => {
      const response = await apiRequest("/api/team/members");
      return response.members || response; // Handle different response formats
    },
    enabled: !!organization?.id
  });

  const allMembers = allMembersData || [];

  // Client-side filtering and sorting
  const filteredAndSortedMembers = React.useMemo(() => {
    let filtered = allMembers;

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = allMembers.filter(
        (member) =>
          member.firstName.toLowerCase().includes(searchLower) ||
          member.lastName.toLowerCase().includes(searchLower) ||
          member.email.toLowerCase().includes(searchLower) ||
          member.role.toLowerCase().includes(searchLower) ||
          member.status.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string;
      let bValue: string;

      switch (sortField) {
        case "name":
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "role":
          aValue = a.role.toLowerCase();
          bValue = b.role.toLowerCase();
          break;
        case "status":
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        default:
          aValue = "";
          bValue = "";
      }

      if (sortOrder === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

    return filtered;
  }, [allMembers, searchTerm, sortField, sortOrder]);

  // Client-side pagination
  const totalCount = filteredAndSortedMembers.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const members = filteredAndSortedMembers.slice(startIndex, endIndex);

  // Reset to first page when search or sort changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortOrder]);

  // Ensure current page is valid when data changes
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Mutations
  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest(`/api/team/members/${memberId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/team/members"]
      });
      toast({
        title: "Success",
        description: "Team member deleted successfully"
      });
      setMemberToDelete(null);
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete team member",
        variant: "destructive"
      });
    }
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({
      memberId,
      updates
    }: {
      memberId: string;
      updates: Partial<TeamMember>;
    }) => {
      const response = await apiRequest(`/api/team/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify(updates)
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/team/members"]
      });
      toast({
        title: "Success",
        description: "Team member updated successfully"
      });
      setEditingMember(null);
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update team member",
        variant: "destructive"
      });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (memberIds: string[]) => {
      await apiRequest("/api/team/members/bulk-delete", {
        method: "POST",
        body: JSON.stringify({memberIds})
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/team/members"]
      });
      toast({
        title: "Success",
        description: `${selectedMembers.size} team members deleted successfully`
      });
      setSelectedMembers(new Set());
      setIsBulkDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete team members",
        variant: "destructive"
      });
    }
  });

  const resendInvitationMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest(`/api/team/members/${memberId}/resend-invitation`, {
        method: "POST"
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invitation resent successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resend invitation",
        variant: "destructive"
      });
    }
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive"
      });
      return;
    }

    try {
      await sendInvitations.mutateAsync({
        emails: [inviteEmail],
        organizationId: organization.id,
        role: inviteRole
      });

      toast({
        title: "Success",
        description: "Invitation sent successfully"
      });

      setInviteEmail("");
      setInviteRole("User");
      setIsInviteDialogOpen(false);

      // Refresh the members list
      queryClient.invalidateQueries({
        queryKey: ["/api/team/members"]
      });
    } catch (error) {
      console.error("Failed to send invitation", error);
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive"
      });
    }
  };

  const handleDeleteMember = async (member: TeamMember) => {
    setMemberToDelete(member);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;
    await deleteMemberMutation.mutateAsync(memberToDelete.id);
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setIsEditDialogOpen(true);
  };

  const handleUpdateMember = async (updates: Partial<TeamMember>) => {
    if (!editingMember) return;
    await updateMemberMutation.mutateAsync({
      memberId: editingMember.id,
      updates
    });
  };

  const handleBulkDelete = async () => {
    if (selectedMembers.size === 0) return;
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    const memberIds = Array.from(selectedMembers);
    await bulkDeleteMutation.mutateAsync(memberIds);
  };

  const handleResendInvitation = async (memberId: string) => {
    await resendInvitationMutation.mutateAsync(memberId);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const SortIcon = ({field}: {field: SortField}) => {
    if (sortField !== field) return <ChevronDown className="ml-2 h-4 w-4" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" />
    );
  };

  const generatePaginationItems = () => {
    const maxVisibleButtons = 6;
    const items: (number | "ellipsis")[] = [];

    if (totalPages <= maxVisibleButtons) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
      return items;
    }

    items.push(1);

    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
      endPage = Math.min(totalPages - 1, maxVisibleButtons - 1);
    } else if (currentPage >= totalPages - 2) {
      startPage = Math.max(2, totalPages - maxVisibleButtons + 2);
    }

    if (startPage > 2) {
      items.push("ellipsis");
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(i);
    }

    if (endPage < totalPages - 1) {
      items.push("ellipsis");
    }

    if (totalPages > 1) {
      items.push(totalPages);
    }

    return items;
  };

  const toggleSelectMember = (memberId: string) => {
    setSelectedMembers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedMembers.size === members.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(members.map((member) => member.id)));
    }
  };

  return (
    <div className="p-6 bg-white">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-gray-900">
                Team members
              </h1>
              <span className="text-sm text-gray-700 border border-gray-300 bg-gray-50 rounded-full px-2 py-1">
                {totalCount} user{totalCount !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Manage your team members and their account permissions here.
            </p>
          </div>
          {isCompanyAdmin && (
            <Dialog
              open={isInviteDialogOpen}
              onOpenChange={setIsInviteDialogOpen}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium mb-1"
                    >
                      Email address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="role"
                      className="block text-sm font-medium mb-1"
                    >
                      Role
                    </label>
                    <Select
                      value={inviteRole}
                      onValueChange={(value: "Company Admin" | "User") =>
                        setInviteRole(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="User">User</SelectItem>
                        <SelectItem value="Company Admin">
                          Company Admin
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsInviteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleInvite}
                      disabled={sendInvitations.isPending}
                    >
                      {sendInvitations.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Invitation"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search and Bulk Actions */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            {selectedMembers.size > 0 && isCompanyAdmin && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedMembers.size} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Selected
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        {isLoadingMembers ? (
          <div className="p-8">
            <div className="space-y-4">
              {Array.from({length: 5}).map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      selectedMembers.size === members.length &&
                      members.length > 0
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center">
                    Name
                    <SortIcon field="name" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("role")}
                >
                  <div className="flex items-center">
                    Role
                    <SortIcon field="role" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center">
                    Status
                    <SortIcon field="status" />
                  </div>
                </TableHead>
                {isCompanyAdmin && <TableHead className="w-16"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isCompanyAdmin ? 5 : 4}
                    className="text-center py-16"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <h3 className="text-lg font-medium">
                        No team members found
                      </h3>
                      <p className="text-muted-foreground mt-1">
                        {searchTerm
                          ? "No members match your search."
                          : "Invite team members to get started."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedMembers.has(member.id)}
                        onCheckedChange={() => toggleSelectMember(member.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={member.profileImage}
                            alt={`${member.firstName} ${member.lastName}`}
                          />
                          <AvatarFallback>
                            {member.firstName.charAt(0)}
                            {member.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900">
                            {member.firstName} {member.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-900">
                        {member.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            member.status === "Active" ? "default" : "secondary"
                          }
                          className={
                            member.status === "Active"
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-orange-100 text-orange-800 border-orange-200"
                          }
                        >
                          {member.status}
                        </Badge>
                        {member.status === "Invited" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResendInvitation(member.id)}
                            disabled={resendInvitationMutation.isPending}
                            className="text-blue-600 hover:text-blue-700 p-1"
                          >
                            {resendInvitationMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    {isCompanyAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMember(member)}
                            className="h-8 w-8 text-gray-400 hover:text-gray-600"
                            disabled={deleteMemberMutation.isPending}
                          >
                            {deleteMemberMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditMember(member)}
                            className="h-8 w-8 text-gray-400 hover:text-gray-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center space-x-1">
            {generatePaginationItems().map((item) =>
              item === "ellipsis" ? (
                <div
                  key={`ellipsis-${Math.random()}`}
                  className="flex items-center justify-center w-8 h-8"
                >
                  <span className="text-sm text-gray-500">...</span>
                </div>
              ) : (
                <Button
                  key={item}
                  variant={currentPage === item ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "w-8 h-8 text-sm",
                    currentPage === item
                      ? "bg-gray-900 text-white hover:bg-gray-800"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                  onClick={() => setCurrentPage(item)}
                >
                  {item}
                </Button>
              )
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update the role and status of {editingMember?.firstName}{" "}
              {editingMember?.lastName}
            </DialogDescription>
          </DialogHeader>
          {editingMember && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <Select
                  value={editingMember.role}
                  onValueChange={(value: "Company Admin" | "User") =>
                    setEditingMember({...editingMember, role: value})
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="User">User</SelectItem>
                    <SelectItem value="Company Admin">Company Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <Select
                  value={editingMember.status}
                  onValueChange={(value: "Active" | "Invited" | "Inactive") =>
                    setEditingMember({...editingMember, status: value})
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Invited">Invited</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    handleUpdateMember({
                      role: editingMember.role,
                      status: editingMember.status
                    })
                  }
                  disabled={updateMemberMutation.isPending}
                >
                  {updateMemberMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Member"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Member Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {memberToDelete?.firstName}{" "}
              {memberToDelete?.lastName}? This action cannot be undone and they
              will lose access to the organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMember}
              disabled={deleteMemberMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMemberMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Member"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Members</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedMembers.size} selected
              team members? This action cannot be undone and they will lose
              access to the organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkDeleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedMembers.size} Members`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamSettings;
