//frontend/components/drips/create-drip-form.tsx
"use client"
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, ApiUser, ApiMessageMaster, ApiDripSequenceCreatePayload, ApiDripSequence } from "@/lib/api";

interface CreateDripFormProps {
  currentUser: ApiUser;
  existingDrip?: ApiDripSequence | null;
}

interface DripStep extends Omit<ApiDripSequenceCreatePayload['steps'][0], 'message_id'> {
    localId: string;
    message: ApiMessageMaster;
}

function SortableStepRow({ step, index, onRemove }: { step: DripStep, index: number, onRemove: (id: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: step.localId });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <TableRow ref={setNodeRef} style={style} {...attributes}>
            <TableCell {...listeners} className="cursor-grab touch-none">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </TableCell>
            <TableCell>{index + 1}</TableCell>
            <TableCell>Day {step.day_to_send}</TableCell>
            <TableCell>{step.time_to_send}</TableCell>
            <TableCell>{step.message.message_name}</TableCell>
            <TableCell><Button variant="ghost" size="icon" onClick={() => onRemove(step.localId)}><X className="h-4 w-4" /></Button></TableCell>
        </TableRow>
    );
}

export function CreateDripForm({ currentUser, existingDrip = null }: CreateDripFormProps) {
    const [dripName, setDripName] = useState("");
    const [messages, setMessages] = useState<ApiMessageMaster[]>([]);
    const [steps, setSteps] = useState<DripStep[]>([]);
    const [currentStep, setCurrentStep] = useState({ day: "0", time: "09:00", messageId: "" });
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const isEditMode = !!existingDrip;

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        api.getMessages().then(setMessages).catch(() => toast({ title: "Error", description: "Could not load messages for dropdown.", variant: "destructive" }));

        if (isEditMode && existingDrip) {
            setDripName(existingDrip.drip_name);
            const initialSteps = existingDrip.steps.map(step => ({
                localId: `step-${step.id}`,
                message: step.message,
                day_to_send: step.day_to_send,
                time_to_send: step.time_to_send,
                sequence_order: step.sequence_order,
            })).sort((a, b) => a.sequence_order - b.sequence_order);
            setSteps(initialSteps);
        }
    }, [toast, isEditMode, existingDrip]);

    const handleAddStep = () => {
        if (!currentStep.messageId) {
            toast({ title: "Error", description: "Please select a message.", variant: "destructive" });
            return;
        }
        const selectedMessage = messages.find(m => m.id === parseInt(currentStep.messageId));
        if (!selectedMessage) return;

        const newStep: DripStep = {
            localId: `step-${Date.now()}`,
            message: selectedMessage,
            day_to_send: parseInt(currentStep.day) || 0,
            time_to_send: currentStep.time,
            sequence_order: steps.length,
        };
        setSteps(prev => [...prev, newStep]);
        setCurrentStep({ day: "1", time: "09:00", messageId: "" });
    };

    const handleRemoveStep = (localId: string) => {
        const newSteps = steps.filter(step => step.localId !== localId)
            .map((step, index) => ({ ...step, sequence_order: index }));
        setSteps(newSteps);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setSteps((items) => {
                const oldIndex = items.findIndex((item) => item.localId === active.id);
                const newIndex = items.findIndex((item) => item.localId === over.id);
                const reorderedItems = arrayMove(items, oldIndex, newIndex);
                return reorderedItems.map((item, index) => ({ ...item, sequence_order: index }));
            });
        }
    };

    const handleSubmit = async () => {
        if (!dripName.trim()) {
            toast({ title: "Error", description: "Drip Sequence Name is required.", variant: "destructive" });
            return;
        }
        if (steps.length === 0) {
            toast({ title: "Error", description: "Please add at least one step to the sequence.", variant: "destructive" });
            return;
        }
        setIsLoading(true);

        const payload: ApiDripSequenceCreatePayload = {
            drip_name: dripName,
            created_by: currentUser.username,
            steps: steps.map(step => ({
                message_id: step.message.id,
                day_to_send: step.day_to_send,
                time_to_send: step.time_to_send.substring(0, 5),
                sequence_order: step.sequence_order,
            })),
        };

         try {
            if (isEditMode && existingDrip) {
                await api.updateDripSequence(existingDrip.id, payload);
                toast({ title: "Success", description: "Drip sequence updated successfully." });
            } else {
                await api.createDripSequence(payload);
                toast({ title: "Success", description: "Drip sequence created successfully." });
            }
            router.push("/dashboard/drip-sequence");
        } catch (error) {
            toast({ title: "Error", description: `Failed to ${isEditMode ? 'update' : 'create'} drip sequence.`, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    const selectedMessageDetails = messages.find(m => m.id === parseInt(currentStep.messageId));

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>1. Drip Details & Step Builder</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="drip_name">Drip Sequence Name *</Label>
                        <Input id="drip_name" value={dripName} onChange={e => setDripName(e.target.value)} placeholder="e.g., New Lead Welcome Sequence" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 border p-4 rounded-lg">
                        <div className="space-y-2 md:col-span-2"><Label>Message</Label><Select value={currentStep.messageId} onValueChange={val => setCurrentStep({...currentStep, messageId: val})}><SelectTrigger><SelectValue placeholder="Select a message..."/></SelectTrigger><SelectContent>{messages.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.message_name}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Day</Label><Input type="number" value={currentStep.day} onChange={e => setCurrentStep({...currentStep, day: e.target.value})} min="0" /></div>
                        <div className="space-y-2"><Label>Time</Label><Input type="time" value={currentStep.time} onChange={e => setCurrentStep({...currentStep, time: e.target.value})} /></div>
                        <div className="flex items-end"><Button onClick={handleAddStep} className="w-full">Add Step</Button></div>
                    </div>
                    {selectedMessageDetails && (
                        <div className="p-4 bg-muted rounded-lg text-sm">
                            <p><strong>Type:</strong> <span className="capitalize">{selectedMessageDetails.message_type}</span></p>
                            <p className="mt-1"><strong>Content:</strong> {selectedMessageDetails.message_content || "Attachment"}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>2. Sequence Steps</CardTitle></CardHeader>
                <CardContent>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <Table>
                            <TableHeader><TableRow><TableHead className="w-12"></TableHead><TableHead>Order</TableHead><TableHead>Day</TableHead><TableHead>Time</TableHead><TableHead>Message Name</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
                            <SortableContext items={steps.map(s => s.localId)} strategy={verticalListSortingStrategy}>
                                <TableBody>
                                    {steps.map((step, index) => (
                                        <SortableStepRow key={step.localId} step={step} index={index} onRemove={handleRemoveStep} />
                                    ))}
                                </TableBody>
                            </SortableContext>
                        </Table>
                    </DndContext>
                    {steps.length === 0 && <p className="text-center text-muted-foreground py-8">Add steps using the builder above.</p>}
                </CardContent>
            </Card>
            
            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={isLoading}>{isLoading ? "Saving..." : isEditMode ? "Update Drip Sequence" : "Save Drip Sequence"}</Button>
            </div>
        </div>
    );
}