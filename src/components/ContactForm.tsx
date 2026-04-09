'use client'

import { useState, useTransition } from 'react'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { sendContactMessage } from '@/lib/actions/contact'

interface ContactFormProps {
  recipientFamilyId: string
  recipientFamilyName: string
}

export function ContactForm({ recipientFamilyId, recipientFamilyName }: ContactFormProps) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const MAX = 1000
  const remaining = MAX - message.length

  function handleOpen() {
    setOpen(true)
    setResult(null)
    setMessage('')
  }

  function handleSubmit() {
    if (!message.trim() || message.length > MAX) return
    startTransition(async () => {
      const res = await sendContactMessage(recipientFamilyId, message.trim())
      setResult(res)
      if (res.success) setMessage('')
    })
  }

  return (
    <>
      <Button onClick={handleOpen} className="gap-2">
        <MessageSquare className="h-4 w-4" />
        Contact this family
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact {recipientFamilyName}</DialogTitle>
            <DialogDescription>
              Your message will be delivered to this family. Your email address will not be shared.
            </DialogDescription>
          </DialogHeader>

          {result?.success ? (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
              Message sent! The family will receive a notification.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact-message">Your message</Label>
                <Textarea
                  id="contact-message"
                  placeholder="Hi! We noticed our kids share similar interests..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={MAX}
                  className="resize-none"
                />
                <p className={`text-xs text-right ${remaining < 50 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {remaining} characters remaining
                </p>
              </div>

              {result?.error && (
                <p className="text-sm text-destructive">{result.error}</p>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isPending || !message.trim() || message.length > MAX}
                >
                  {isPending ? 'Sending…' : 'Send message'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
