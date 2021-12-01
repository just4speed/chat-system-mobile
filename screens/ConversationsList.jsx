import React from "react";
import { SafeAreaView, ScrollView, View, TouchableOpacity, RefreshControl, Text, Image, StyleSheet } from "react-native";
import {
    widthPercentageToDP as wp, heightPercentageToDP as hp
} from "react-native-responsive-screen";
import { useIsFocused } from '@react-navigation/native';
import axios from "axios";
import { io } from "socket.io-client";
import TimeAgo from 'react-timeago';

const userData = {
    _id: "619e27634c90d133d75c75bc",
    name: "Eren",
    profilePicture: "https://static.wikia.nocookie.net/villains/images/4/4c/Eren_meets_Yeagerists.png/revision/latest?cb=20210302172340",
    blocked: []
}

const ConversationCard = ({
    item, opponent, isMyMessageLast, openDialog
}) => {
    return(
        <TouchableOpacity style={styles.conversationCard} onPress={() => openDialog(item._id)}>
            <Image
                source={{ uri: opponent.profilePicture }}
                style={styles.avatar}
            />
            <View style={{ flexDirection: "column" }}>
                <Text style={styles.name}>{ opponent.name }</Text>
                <Text
                    style={[styles.lastMessage, {
                        color: isMyMessageLast ? "grey" : "#000",
                        fontWeight: (!isMyMessageLast && !item.messages[item.messages.length - 1].read) ? "bold" : "normal"
                    }]}
                >{ item.messages[item.messages.length - 1].text.substring(0, 20) }</Text>
            </View>
            <View style={styles.details}>
                <Text style={styles.sent}>
                    <TimeAgo date={item.messages[item.messages.length - 1].sent} component={Text} />
                </Text>
                { isMyMessageLast && (
                    <Image
                        source={require("../assets/icons/tick.png")}
                        style={{ ...styles.read, opacity: item.messages[item.messages.length - 1].read ? 1 : 0.3 }}
                    />
                ) }
            </View>
        </TouchableOpacity>
    )
}

const ConversationsList = ({ navigation }) => {
    const socketRef = React.useRef(null);
    const [conversations, setConversations] = React.useState([]);
    const [conversationsLoaded, setConversationsLoaded] = React.useState(true);
    const isFocused = useIsFocused();
    const [refreshing, setRefreshing] = React.useState(false);

    React.useEffect(() => {
        socketRef.current = io("http://192.168.0.105:5000");
        // Fetch conversations
        fetchConversations();
    }, []);
    

    React.useEffect(() => {
        socketRef.current.removeAllListeners();
        socketRef.current.on("New Message in a Conversation", message => {
          if(conversations.filter(cv => cv._id === message.conversationId).length > 0){
            const conv = conversations.find(cv => cv._id === message.conversationId);
            const convIndex = conversations.indexOf(conv);
            conversations[convIndex].messages.push(message);
          }
          setConversations(conversations);
        });
    }, [conversations, isFocused]);

    const fetchConversations = (toRefresh = false) => {
        axios.get("http://192.168.0.105:5000/conversations/" + userData._id)
        .catch(e => console.log(e))
        .then(result => {
            if(result.status === 200){
                let convsArray = result.data;
                // console.log(convsArray)
                for(let i = 0; i <= convsArray.length - 1; i++){
                    convsArray[i].displaying = true;
                }
                setConversations(convsArray);
                setConversationsLoaded(true);
                if(toRefresh){
                    setRefreshing(false)
                }
            }
        })
    }

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchConversations(true);
    }, []);

    const openDialog = conversationId => {
        navigation.navigate("Conversation", {
            conversationId: conversationId,
            // userId: "61a75a3a5e1d83c28d74a80e"
        });
    }

    return(
        <SafeAreaView>
            <ScrollView
                vertical
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
            >
                <View>
                    { conversations.map((item, index) => {
                        const opponent = item.members.find(m => m._id !== userData._id);
                        const isMyMessageLast = item.messages[item.messages.length - 1].sender === userData._id;
                        return(
                            <ConversationCard
                                key={index}
                                item={item}
                                opponent={opponent}
                                isMyMessageLast={isMyMessageLast}
                                openDialog={openDialog}
                            />
                        )
                    }) }
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    conversationCard: {
        flexDirection: "row",
        paddingHorizontal: 20,
        paddingVertical: 10,
        alignItems: "center",
        backgroundColor: "#fff",
        position: "relative"
    },
    avatar: {
        width: wp("17%"),
        height: wp("17%"),
        borderRadius: 50,
        marginRight: wp("5%")
    },
    name: {
        fontWeight: "bold",
        fontSize: wp("6%"),
        marginBottom: hp("0.5%")
    },
    lastMessage: {
        fontSize: wp("4%")
    },
    read: {
        width: wp("3.5%"),
        height: wp("3.5%")
    },
    details: {
        position: "absolute",
        right: wp("10%"),
        flexDirection: "column",
        alignItems: "flex-end",
    },
    sent: {
        color: "grey",
        fontSize: wp("3%"),
        marginBottom: hp("2%")
    }
})

export default ConversationsList;