import mongoose from "mongoose";

const mesageSchema = new mongoose.Schema({
    senderId:{type: mongoose.Schema.Types.ObjectId,ref:"User",require:true},
    receiverId:{type: mongoose.Schema.Types.ObjectId,ref:"User"},  // optional for party messages
    text:{type:String,},
    image:{type:String,},
    gifUrl:{type:String, default: ""},
    videoUrl:{type:String, default: ""},
    messageType:{type:String, enum:["text","image","gif","video","system"], default:"text"},
    linkPreview: {
        title: {type: String, default: ""},
        description: {type: String, default: ""},
        image: {type: String, default: ""},
        siteName: {type: String, default: ""},
        url: {type: String, default: ""},
    },
    seen:{type:Boolean,default:false},

    // ── Phase 3: Enhanced Messaging ─────────────────────────────────────────
    reactions: [{
        emoji:  { type: String, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    }],
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    isEdited:  { type: Boolean, default: false },
    editedAt:  { type: Date },
    deletedAt: { type: Date },  // soft delete — null = not deleted

    // ── Phase 3: Party/Group Messages ───────────────────────────────────────
    partyId: { type: mongoose.Schema.Types.ObjectId, ref: "Party" },
},{timestamps:true});

// Compound index for fast DM lookups
mesageSchema.index({ senderId: 1, receiverId: 1 });
// Index for party message queries
mesageSchema.index({ partyId: 1, createdAt: 1 });

const Message = mongoose.model("Message",mesageSchema);
export default Message;