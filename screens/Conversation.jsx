import React from "react";
import { SafeAreaView, ScrollView, View, ToastAndroid, Text, TouchableOpacity, Image, TextInput, StyleSheet } from "react-native";
import {
    widthPercentageToDP as wp, heightPercentageToDP as hp
} from "react-native-responsive-screen";
import axios from "axios";
import { io } from "socket.io-client";
import TimeAgo from 'react-timeago';
import * as WebBrowser from 'expo-web-browser';
// FontAwesome
import { faPaperPlane, faPaperclip, faCommentDots, faUserSlash, faUserCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import * as DocumentPicker from 'expo-document-picker';


const userData = {
    _id: "619e27634c90d133d75c75bc",
    name: "Eren",
    profilePicture: "https://static.wikia.nocookie.net/villains/images/4/4c/Eren_meets_Yeagerists.png/revision/latest?cb=20210302172340",
    blocked: []
}

const Message = ({ isMessageMine, item, author }) => {
    const openAttachment = async (url) => {
        await WebBrowser.openBrowserAsync(url);
    }
    return(
        <View
            style={{
                ...styles.messageCard,
                alignItems: "flex-start",
                flexDirection: isMessageMine ? "row-reverse" : "row"
            }}
        >
            <Image
                source={{ uri: author.profilePicture }}
                    style={{
                    ...styles.senderAvatar,
                    marginRight: isMessageMine ? 0 : wp("5%"),
                    marginLeft: !isMessageMine ? 0 : wp("5%")
                }}
            />
            <View style={{ maxWidth: "50%" }}>
                <View style={{ ...styles.messageSpace, backgroundColor: isMessageMine ? "#6d68ec" : "#F2F2F2" }}>
                    <Text style={{ flexShrink: 1, color: isMessageMine ? "#fff" : "#000" }}>{ item.text }</Text>
                </View>
                { item.attachments.length > 0 && (
                    <View style={styles.attachments}>
                        { item.attachments.map((attachment, index) => (
                            <TouchableOpacity onPress={() => openAttachment(attachment.url)}>
                                <Text style={styles.attachmentName}>{ attachment.name }</Text>
                            </TouchableOpacity>
                        )) }
                    </View>
                ) }
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={styles.sent}>
                        <TimeAgo minPeriod={30} date={item.sent} component={Text} />
                    </Text>
                    { isMessageMine && (
                        <Image
                            source={require("../assets/icons/tick.png")}
                            style={{ ...styles.read, opacity: item.read ? 1 : 0.2 }}
                        />
                    ) }
                </View>
            </View>
        </View>
    )
}

const Conversation = ({ navigation, route }) => {
    const socketRef = React.useRef(null);
    const scrollViewRef = React.useRef();
    const [messages, setMessages] = React.useState([]);
    const [messagesLoaded, setMessagesLoaded] = React.useState(false);
    const [opponentTyping, setOpponentTyping] = React.useState(false);
    const [opponent, setOpponent] = React.useState(null);
    // Current conversation id
    const { conversationId, userId } = route.params;
    // Message input
    const [message, setMessage] = React.useState("");
    const [attachments, setAttachments] = React.useState([]);
    // New conversation
    const [newConversation, setNewConversation] = React.useState(false);
    const [newConversationError, setNewConversationError] = React.useState(false);
    const [newConversationUser, setNewConversationUser] = React.useState(null);

    React.useEffect(async () => {
        socketRef.current = io("http://192.168.0.105:5000");
        if(userId !== undefined){
            setNewConversation(true);
            await axios.get("http://192.168.0.105:5000/conversations/opponentData/" + userId)
            .catch(e => {
                if(e){
                    setNewConversationError(true);
                }
            }).then(result => {
                if(result?.status === 200){
                    setNewConversationUser(result.data);
                }
            })
        } else {
            await axios.get("http://192.168.0.105:5000/messages/" + conversationId + "/?uid=" + userData._id)
            .then(result => {
                const messages = result.data;
                if(result.status === 200){
                    setMessages(messages);
                    setMessagesLoaded(true);
                    setMessage("");
                }
            });
            await axios.get("http://192.168.0.105:5000/conversations/members/" + conversationId)
            .then(result => {
                if(result.status === 200){
                    setOpponent(result.data.members.find(m => m._id !== userData._id));
                }
            })
            socketRef.current.on("User typing [client]", data => {
                if(data.conversationId === conversationId && data.userId === userData._id){
                setOpponentTyping(true);
                //   while(opponentTyping == true){
                //     Animated.timing(typingEffect, {
                //         toValue: 1,
                //         duration: 500
                //       }).start();
                //       Animated.timing(typingEffect, {
                //         toValue: 1,
                //         duration: 500
                //       }).start();
                //   }
                setTimeout(() => {
                    setOpponentTyping(false);
                }, 5000);
                }
            })
        }
    }, []);

    React.useEffect(() => {
        socketRef.current.removeAllListeners();

        const handler = message => {
            if(message.conversationId === conversationId){
                console.warn("trigger")
                setMessages(messages.concat([message]));
            }
        }
        socketRef.current.on("New Message in a Conversation", handler);
        return () => {
            socketRef.current.off('New Message in a Conversation', handler);
        }
    }, [messages]);

    const editText = value => {
        setMessage(value);
        socketRef.current.emit("User typing [server]", {
            conversationId,
            userId: userData._id
        });
    }

    const sendMessage = async () => {
        if(message !== ""){
            const formData = new FormData();
            for(let i = 0; i <= attachments.length - 1; i++){
                formData.append(`attachment-${i}`, {
                    ...attachments[i],
                    type: 'multipart/form-data'
                });
            }
            formData.append("attachments", attachments);
            formData.append("conversationId", conversationId);
            formData.append("message", message);
            formData.append("sender", JSON.stringify(userData));
            axios.post("http://192.168.0.105:5000/messages/", formData)
            .then(result => {
                //
            }).catch(e => {
                console.warn("error | ", e.response)
            })
            setMessage("");
            setAttachments([]);
        }
    }

    const startConversation = () => {
        if(!(message === "" && attachments.length === 0)){
          const formData = new FormData();
          for(let i = 0; i <= attachments.length - 1; i++){
            formData.append(`attachment-${i}`, attachments[i]);
          }
          formData.append("message", message);
          formData.append("sender", JSON.stringify(userData));
          formData.append("receiverId", newConversationUser._id);
          axios.post("http://192.168.0.105:5000/conversations/", formData)
          .then(result => {
            if(result.status === 200){
              navigation.replace("Conversation", {
                conversationId: result.data._id
              });
            }
          })
        }
    }

    const blockUser = () => {
        let uid;
        if(newConversation){
            uid = newConversationUser?._id;
        } else {
            uid = opponent?._id;
        }
        axios.post("http://192.168.0.105:5000/user/block", {
            isBlocking: userData._id,
            toBlock: uid
        }).then(result => {
            if(result?.status === 200){
                alert("You blocked/unblocked this user");
            }
        })
    }

    const pickDocuments = async () => {
        let result = await DocumentPicker.getDocumentAsync({});
		setAttachments([result]);
    }

    return(
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff", paddingTop: hp("5%") }}>

            <View style={styles.opponentDataBlock}>
                <View style={{ flexDirection: "row" }}>
                    <Image
                        source={{ uri: newConversation ? newConversationUser?.profilePicture : opponent?.profilePicture }}
                        style={styles.opponentAvatar}
                    />
                    <View>
                        <Text style={styles.opponentName}>{newConversation ? newConversationUser?.name : opponent?.name }</Text>
                        <Text style={styles.online}>Online</Text>
                    </View>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity onPress={blockUser}>
                        { newConversation ? !userData.blocked.includes(newConversationUser._id) ? (
                            <FontAwesomeIcon size={25} icon={faUserSlash} /> 
                        ) : (
                            <FontAwesomeIcon size={25} icon={faUserCheck} />
                        ) : !userData.blocked.includes(opponent?._id) ? (
                            <FontAwesomeIcon size={25} icon={faUserSlash} /> 
                        ) : <FontAwesomeIcon size={25} icon={faUserCheck} /> }
                    </TouchableOpacity>
                </View>
            </View>

            { (!messagesLoaded && !newConversationUser) && (
                <Text style={styles.loading}>Loading</Text>
            ) } 

            <ScrollView
                vertical
                style={{ height: hp("70%")}}
                ref={scrollViewRef}
                onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}
            >
                { (messagesLoaded && opponent !== null) && (
                    <View style={styles.messagesBlock}>
                        { messages.map((item, index) => {
                            const isMessageMine = item.sender === userData._id;
                            const author = [userData, opponent].find(u => u._id === item.sender);
                            return(
                                <Message
                                    key={index}
                                    author={author}
                                    isMessageMine={isMessageMine}
                                    item={item}
                                />
                            )
                        }) }
                    { opponentTyping && (
                        <View
                            style={{
                                ...styles.messageCard,
                                alignItems: "flex-start",
                                flexDirection: "row"
                            }}
                        >
                            <Image
                                source={{ uri: opponent.profilePicture }}
                                    style={{
                                    ...styles.senderAvatar,
                                    marginRight: wp("5%"),
                                }}
                            />
                                <View style={{ maxWidth: "50%" }}>
                                    <View style={{ ...styles.messageSpace, backgroundColor: "#6d68ec" }}>
                                        <FontAwesomeIcon color={"#fff"} size={20} icon={faCommentDots} />
                                    </View>
                                </View>
                            </View>
                    ) }
                    </View>
                ) }
            </ScrollView>

            <View style={styles.messageConstructor}>
                <TouchableOpacity onPress={pickDocuments}>
                    <FontAwesomeIcon color={"#6b6b6b"} size={20} icon={faPaperclip} />
                </TouchableOpacity>
                <TextInput
                    placeholder={"Your message"}
                    style={styles.inputStyle}
                    onSubmitEditing={sendMessage}
                    onChangeText={editText}
                />
                <TouchableOpacity onPress={() => {
                    if(newConversation){
                        startConversation();
                    } else {
                        sendMessage();
                    }
                }}>
                    <FontAwesomeIcon color={"#6d68ec"} size={20} icon={faPaperPlane} />
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    opponentDataBlock: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: hp("2%"),
        paddingHorizontal: wp("7%"),
        borderBottomColor: "#f2f2f2",
        borderBottomWidth: hp("0.5%")
    },
    opponentAvatar: {
        borderRadius: wp("20%"),
        width: wp("13%"),
        height: wp("13%"),
        marginRight: wp("5%"),
    },
    opponentName: {
        fontSize: wp("5%"),
        fontWeight: "bold",
    },
    online: {
        fontSize: wp("3.5%"),
        color: "#6b6b6b"
    },
    messagesBlock: {
        paddingHorizontal: wp("5%"),
        width: wp("100%")
    },
    messageCard: {
        marginVertical: hp("1.5%"),
    },
    senderAvatar: {
        borderRadius: wp("50%"),
        width: wp("10%"),
        height: wp("10%")
    },
    messageSpace: {
        paddingVertical: hp("1.5%"),
        paddingHorizontal: wp("5%"),
        borderRadius: wp("1%"),
        marginBottom: hp("1%"),
    },
    sent: {
        fontSize: wp("3%"),
        color: "#6b6b6b",
        marginRight: wp("3%")
    },
    read: {
        width: wp("3.5%"),
        height: wp("3.5%")
    },
    attachments: {
        marginBottom: hp("1%")
    },
    attachmentName: {
        color: "#6d68ec",
        fontSize: wp("3%"),
        marginBottom: hp("0.5%")
    },
    messageConstructor: {
        backgroundColor: "#f2f2f2",
        marginHorizontal: wp("6%"),
        paddingHorizontal: wp("6%"),
        borderRadius: wp("30%"),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between"
    },
    inputStyle: {
        paddingHorizontal: wp("5%"),
        height: hp("7%"),
        width: wp("60%")
    },
    loading: {
        textAlign: "center",
        fontSize: wp("5%"),
        marginTop: hp("5%")
    },
});

export default Conversation;