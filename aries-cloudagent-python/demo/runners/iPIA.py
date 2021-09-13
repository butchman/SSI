import asyncio
import json
import logging
import os
import random
import sys
import time
import argparse
import datetime

import os.path
from os import path

import aiohttp
from qrcode import QRCode

from aiohttp import ClientError

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from runners.support.myagent import MyAgent, default_genesis_txns  # noqa:E402
from runners.support.utils import (  # noqa:E402
    log_msg,
    log_status,
    log_timer,
    prompt,
    prompt_loop,
    require_indy,
)

CRED_PREVIEW_TYPE = "https://didcomm.org/issue-credential/1.0/credential-preview"
SELF_ATTESTED = os.getenv("SELF_ATTESTED")
TAILS_FILE_COUNT = int(os.getenv("TAILS_FILE_COUNT", 100))

logging.basicConfig(level=logging.WARNING)
LOGGER = logging.getLogger(__name__)

nid_schema_name = 'תעודת זהות לאומית'
nid_schema_version_H = 1
nid_schema_version_M = 2
nid_schema_version_L = 4

agentNamePrefix = 'iPIA'
agentNameDef = 'משרד הפנים'

class iPIAAgent(MyAgent):
    def __init__(
        self,
        ident: str,
        http_port: int,
        admin_port: int,
        no_auto: bool = False,
        **kwargs,
    ):
        super().__init__(
            ident,
            http_port,
            admin_port,
            prefix=agentNamePrefix,
            extra_args=[]
            if no_auto
            else ["--auto-accept-invites", "--auto-accept-requests"],
            **kwargs,
        )

        self.connection_id = None
        self.invitation_key = None
        self._connection_ready = None
        self.cred_state = {}
        # TODO define a dict to hold credential attributes
        # based on credential_definition_id
        self.cred_attrs = {}

    async def detect_connection(self):
        await self._connection_ready

    @property
    def connection_ready(self):
        return self._connection_ready.done() and self._connection_ready.result()

    async def handle_oob_invitation(self, message):
        pass

    async def handle_connections(self, message):
        print('===========================================================================================')
        print('================================== handle_connections ================================')
        print('===========================================================================================')

        conn_id = message["connection_id"]
        print('handle_connections(1) | message=',message)
        if message["state"] == "invitation":
            if message["invitation_key"]:
                self.invitation_key = message["invitation_key"]
            self.connection_id = conn_id
        if conn_id == self.connection_id:
            print('handle_connections(2) | state='+str(message["state"]))
            #if (message["state"] in ["active", "response"]):
            #    print('Connected1')
            #    self.send_webapp_data('http://localhost:3000/webhook')
            if (message["state"] in ["active", "response"] and not self._connection_ready.done()):
                self.log("Connected")
                self._connection_ready.set_result(True)

    async def handle_issue_credential(self, message):
        state = message["state"]
        credential_exchange_id = message["credential_exchange_id"]
        prev_state = self.cred_state.get(credential_exchange_id)
        if prev_state == state:
            return  # ignore
        self.cred_state[credential_exchange_id] = state

        self.log(
            "Credential: state = {}, credential_exchange_id = {}".format(
                state,
                credential_exchange_id,
            )
        )

        if state == "request_received":
            log_status("#17 Issue credential to X")
            # issue credentials based on the credential_definition_id
            cred_attrs = self.cred_attrs[message["credential_definition_id"]]
            cred_preview = {
                "@type": CRED_PREVIEW_TYPE,
                "attributes": [
                    {"name": n, "value": v} for (n, v) in cred_attrs.items()
                ],
            }
            try:
                cred_ex_rec = await self.admin_POST(
                    f"/issue-credential/records/{credential_exchange_id}/issue",
                    {
                        "comment": (
                            f"Issuing credential, exchange {credential_exchange_id}"
                        ),
                        "credential_preview": cred_preview,
                    },
                )
                rev_reg_id = cred_ex_rec.get("revoc_reg_id")
                cred_rev_id = cred_ex_rec.get("revocation_id")
                if rev_reg_id:
                    self.log(f"Revocation registry ID: {rev_reg_id}")
                if cred_rev_id:
                    self.log(f"Credential revocation ID: {cred_rev_id}")
            except ClientError:
                pass

    async def handle_issuer_cred_rev(self, message):
        pass

    async def handle_present_proof(self, message):
        state = message["state"]

        presentation_exchange_id = message["presentation_exchange_id"]
        self.log("Presentation: state =", state, ", presentation_exchange_id =", presentation_exchange_id,)

        if state == "presentation_received":
            log_status("#27 Process the proof provided by X")
            log_status("#28 Check if proof is valid")
            proof = await self.admin_POST(
                f"/present-proof/records/{presentation_exchange_id}/verify-presentation"
            )
            self.log("Proof =", proof["verified"])

    async def handle_basicmessages(self, message):
        self.log("Received message:", message["content"])

    async def api_handle_issuecred(self, message):

        self.log("api_handle_issuecred | message:", str(message))

async def generate_invitation(agent, use_did_exchange: bool):
    agent._connection_ready = asyncio.Future()
    with log_timer("Generate invitation duration:"):
        # Generate an invitation
        log_status("Create an invitation and print out the invite details")
        log_status("=====================================================")
        if use_did_exchange:
            invi_rec = await agent.admin_POST(
                "/out-of-band/create-invitation",
                {"include_handshake": True},
            )
        else:
            invi_rec = await agent.admin_POST("/connections/create-invitation")
            agent.invitaion_url = invi_rec

            log_status("generate_invitation(2) | invitaion_url="+str(agent.invitaion_url))

    qr = QRCode(border=1)
    qr.add_data(invi_rec["invitation_url"])
    log_msg(
        "Use the following JSON to accept the invite from another demo agent."
        " Or use the QR code to connect from a mobile agent."
    )
    log_msg(json.dumps(invi_rec["invitation"]), label="Invitation Data:", color=None)
    qr.print_ascii(invert=True)

    #log_msg("Waiting for connection...")
    #await agent.detect_connection()

async def create_schema_and_cred_def(agent, revocation, schemas_list):
    with log_timer("Publish schema/cred def duration:"):
        log_status("#3/4 Create a new schema/cred def on the ledger")

        schema_list2 = []
        for curr_schema in schemas_list:
            loaded_schema = None
            if path.exists(curr_schema['deffilename']):
                with open(curr_schema['deffilename']) as f:
                    loaded_schema = json.load(f)

                (
                    schema_def_id,  # schema id
                    credential_definition_id,
                ) = await agent.register_schema_and_creddef(
                    loaded_schema['schema_name'],
                    loaded_schema['schema_version'],
                    loaded_schema['attributes'],
                    support_revocation=revocation,
                    revocation_registry_size=TAILS_FILE_COUNT if revocation else None,
                )

                schema_list2.append((schema_def_id,credential_definition_id))
            else:
                print('Error - file '+curr_schema['deffilename']+' does not exits')

        return schema_list2

        #nid_schema_version = format("%d.%d.%d"% (nid_schema_version_H,nid_schema_version_M,nid_schema_version_L,))

        (
            nid_schema_def_id,  # schema id
            nid_credential_definition_id,
        ) = await agent.register_schema_and_creddef(
            nid_schema_name,
            nid_schema_version,
            ["מספר", "שם פרטי", "שם משפחה", "שם אב", "שם אם", "שם סב", "תאריך לידה", "שנת לידה", "ארץ לידה", "מין",
             "תאריך הנפקה", "תאריך תוקף", "timestamp"],
            support_revocation=revocation,
            revocation_registry_size=TAILS_FILE_COUNT if revocation else None,
        )
        return nid_schema_def_id, nid_credential_definition_id

def runTaskRecord(agent, aTaskRecord):
    if aTaskRecord:
        print(aTaskRecord)
        print(aTaskRecord.id)
        print(aTaskRecord.cmd)
        print(aTaskRecord.data)
    return


async def main(
    start_port: int,
    no_auto: bool = False,
    revocation: bool = False,
    tails_server_base_url: str = None,
    show_timing: bool = False,
    multitenant: bool = False,
    use_did_exchange: bool = False,
    wallet_type: str = None,
    args : argparse = None,
):
    genesis = await default_genesis_txns()
    if not genesis:
        print("Error retrieving ledger genesis transactions")
        sys.exit(1)

    agent = None

    try:
        log_status(
            "#1 Provision an agent and wallet, get back configuration details"
            + (f" (Wallet type: {wallet_type})" if wallet_type else "")
        )

        agent = iPIAAgent(
            agentNameDef,
            start_port,
            start_port + 1,
            genesis_data=genesis,
            no_auto=no_auto,
            tails_server_base_url=tails_server_base_url,
            timing=show_timing,
            multitenant=multitenant,
            wallet_type=wallet_type,
            internal_host=args.internal_host,
            external_host=args.external_host,
            wallet_name=args.wallet_name,
            wallet_key=args.wallet_key,
            wallet_seed=args.wallet_seed,
            args=args,
        )

        # load the schema list
        schemalist = None
        if path.exists('schemlist.json'):
            with open('schemlist.json') as f:
                schemalist = json.load(f)

        await agent.listen_webhooks(start_port + 2)
        await agent.listen_myapi(start_port + 3)
        await agent.register_did()

        with log_timer("Startup duration:"):
            await agent.start_process()

        log_msg("Admin URL is at:", agent.admin_url)
        log_msg("Endpoint URL is at:", agent.endpoint)
        log_msg("Webhook URL is at:", agent.webhook_url)
        log_msg("MyAPI URL is at:", agent.myapi_url)
        log_msg("MyAPI POST format: "+agent.myapi_url+"/cmd/{cmd}/")
        log_msg("MyAPI GET format: "+agent.myapi_url+"/query/")

        if multitenant:
            # create an initial managed sub-wallet
            await agent.register_or_switch_wallet(
                agentNamePrefix+".initial",
                public_did=True,
                webhook_port=agent.get_new_webhook_port(),
            )

        # Create the schemas
        if len(schemalist) > 0:
            active_schema_list = await create_schema_and_cred_def(agent, revocation, schemalist)

        while True:
            #generate invitation
            log_msg("Generating a fresh invitation")
            log_msg("==============================================================")
            await generate_invitation(agent, use_did_exchange)
            # wait for connection
            log_msg("Waiting for connection...")
            await agent.detect_connection()
            log_msg("==============================================================")

            log_msg("Connection detected, checking task record list")
            log_msg("----------------------------------------------")
            # check if there's a request connected to this invitation key
            ind = agent.find_key(agent.invitation_key)
            if ind >= 0:
                print('Task record matching key found in position #' + str(ind))
                runTaskRecord(agent, agent.tasklist[ind])
            else:
                print('Task record matching key NOT FOUND')

        log_msg("After endless loop")
        # check if there's a request connected to this invitation key
        ind = agent.find_key(agent.invitation_key)
        if ind >= 0:
            print('Task record matching key found in position #'+str(ind))
            runTaskRecord(agent, agent.tasklist[ind])

        else: # not a special connection

            exchange_tracing = False
            options = (
                "    (1) Issue Credential\n"
                "    (2) Send Proof Request\n"
                "    (3) Send Message\n"
                "    (4) Create New Invitation\n"
            )
            if revocation:
                options += "    (5) Revoke Credential\n" "    (6) Publish Revocations\n"
            if multitenant:
                options += "    (W) Create and/or Enable Wallet\n"
            options += "    (T) Toggle tracing on credential/proof exchange\n"
            options += "    (X) Exit?\n[1/2/3/4/{}{}T/X] ".format(
                "5/6/" if revocation else "",
                "W/" if multitenant else "",
            )
            async for option in prompt_loop(options):
                if option is not None:
                    option = option.strip()

                if option is None or option in "xX":
                    break

                elif option in "wW" and multitenant:
                    target_wallet_name = await prompt("Enter wallet name: ")
                    include_subwallet_webhook = await prompt(
                        "(Y/N) Create sub-wallet webhook target: "
                    )
                    if include_subwallet_webhook.lower() == "y":
                        created = await agent.register_or_switch_wallet(
                            target_wallet_name,
                            webhook_port=agent.get_new_webhook_port(),
                            public_did=True,
                        )
                    else:
                        created = await agent.register_or_switch_wallet(
                            target_wallet_name, public_did=True
                        )
                    # create a schema and cred def for the new wallet
                    # TODO check first in case we are switching between existing wallets
                    if created:
                        # TODO this fails because the new wallet doesn't get a public DID
                        schema_def_id, credential_definition_id = await create_schema_and_cred_def(
                            agent, revocation
                        )

                elif option in "tT":
                    exchange_tracing = not exchange_tracing
                    log_msg(
                        ">>> Credential/Proof Exchange Tracing is {}".format(
                            "ON" if exchange_tracing else "OFF"
                        )
                    )

                elif option == "1":
                    log_status("#13 Issue credential offer to X")

                    id1 = input('ID#: ')
                    name1 = input('name: ')
                    surname1 = input('surname: ')
                    fname1 = input('Father name: ')
                    mname1 = input('Mother name: ')
                    gname1 = input('Grandfather name: ')

                    dob1 = input('DOB in DD-MM-YYYY format: ')
                    dob1d, dob1m, dob1y = map(int, dob1.split('-'))
                    #dob1str = str(datetime.datetime(dob1y, dob1m, dob1d))
                    dob1str = datetime.datetime(dob1y, dob1m, dob1d).strftime("%Y%m%d")

                    pob1 = input('Place of birth (country): ')
                    gender1 = input('gender(M/F): ')

                    issue1 = input('Issue date in DD-MM-YYYY format: ')
                    issue1d, issue1m, issue1y = map(int, issue1.split('-'))
                    #issue1str = str(datetime.datetime(issue1y, issue1m, issue1d))
                    issue1str = datetime.datetime(issue1y, issue1m, issue1d).strftime("%Y%m%d")

                    valid1 = input('Valid Until Date in DD-MM-YYYY format: ')
                    valid1d, valid1m, valid1y = map(int, valid1.split('-'))
                    #valid1str = str(datetime.datetime(valid1y, valid1m, valid1d))
                    valid1str = datetime.datetime(valid1y, valid1m, valid1d).strftime("%Y%m%d")

                    # TODO define attributes to send for credential
                    agent.cred_attrs[nid_credential_definition_id] = {
                        "מספר": id1,
                        "שם פרטי": name1,
                        "שם משפחה": surname1,
                        "שם אב": fname1,
                        "שם אם": mname1,
                        "שם סב": gname1,
                        "תאריך לידה": dob1str,
                        "שנת לידה": str(dob1y),
                        "ארץ לידה": pob1,
                        "מין": gender1,
                        "תאריך הנפקה": issue1str,
                        "תאריך תוקף": valid1str,
                        "timestamp": str(int(time.time())),
                    }

                    cred_preview = {
                        "@type": CRED_PREVIEW_TYPE,
                        "attributes": [
                            {"name": n, "value": v}
                            for (n, v) in agent.cred_attrs[nid_credential_definition_id].items()
                        ],
                    }
                    offer_request = {
                        "connection_id": agent.connection_id,
                        "cred_def_id": nid_credential_definition_id,
                        "comment": f"Offer on cred def id {nid_credential_definition_id}",
                        "auto_issue": False,
                        "auto_remove": False,
                        "credential_preview": cred_preview,
                        "trace": exchange_tracing,
                    }
                    print('------------------------ credential_offer_request -------------------------------------')
                    print(offer_request)
                    print('---------------------------------------------------------------------------------------')
                    await agent.admin_POST("/issue-credential/send-offer", offer_request)
                    # TODO issue an additional credential for Student ID

                elif option == "2":
                    log_status("#20 Request proof of identification from alice")
                    req_attrs = [
                        {
                            "name": "שם פרטי",
                            "restrictions": [{"schema_name": nid_schema_name}],
                        },
                        {
                            "name": "שם משפחה",
                            "restrictions": [{"schema_name": nid_schema_name}],
                        },
                        {
                            "name": "תאריך הנפקה",
                            "restrictions": [{"schema_name": nid_schema_name}],
                        },
                    ]
                    if revocation:
                        req_attrs.append(
                            {
                                "name": "מספר",
                                "restrictions": [{"schema_name": nid_schema_name}],
                                "non_revoked": {"to": int(time.time() - 1)},
                            },
                        )
                    else:
                        req_attrs.append(
                            {
                                "name": "מספר",
                                "restrictions": [{"schema_name": nid_schema_name}],
                            }
                        )
                    if SELF_ATTESTED:
                        # test self-attested claims
                        req_attrs.append(
                            {"name": "self_attested_thing"},
                        )
                    req_preds = [
                        # test zero-knowledge proofs
                        {
                            "name": "שנת לידה",
                            "p_type": "<=",
                            "p_value": 2002,
                            "restrictions": [{"schema_name": nid_schema_name}],
                        }
                    ]
                    indy_proof_request = {
                        "name": "Proof of identification",
                        "version": "1.0",
                        "requested_attributes": {
                            f"0_{req_attr['name']}_uuid": req_attr for req_attr in req_attrs
                        },
                        "requested_predicates": {
                            f"0_{req_pred['name']}_GE_uuid": req_pred
                            for req_pred in req_preds
                        },
                    }

                    if revocation:
                        indy_proof_request["non_revoked"] = {"to": int(time.time())}
                    proof_request_web_request = {
                        "connection_id": agent.connection_id,
                        "proof_request": indy_proof_request,
                        "trace": exchange_tracing,
                    }
                    print('---------------------------------------- proof_request_web_request -----------------------------------')
                    print(proof_request_web_request)
                    print('------------------------------------------------------------------------------------------------------')
                    await agent.admin_POST(
                        "/present-proof/send-request", proof_request_web_request
                    )

                elif option == "3":
                    msg = await prompt("Enter message: ")
                    await agent.admin_POST(
                        f"/connections/{agent.connection_id}/send-message", {"content": msg}
                    )

                elif option == "4":
                    log_msg(
                        "Creating a new invitation, please Receive and Accept this invitation using Alice agent"
                    )
                    await generate_invitation(agent, use_did_exchange)

                elif option == "5" and revocation:
                    rev_reg_id = (await prompt("Enter revocation registry ID: ")).strip()
                    cred_rev_id = (await prompt("Enter credential revocation ID: ")).strip()
                    publish = (
                        await prompt("Publish now? [Y/N]: ", default="N")
                    ).strip() in "yY"
                    try:
                        await agent.admin_POST(
                            "/revocation/revoke",
                            {
                                "rev_reg_id": rev_reg_id,
                                "cred_rev_id": cred_rev_id,
                                "publish": publish,
                            },
                        )
                    except ClientError:
                        pass

                elif option == "6" and revocation:
                    try:
                        resp = await agent.admin_POST("/revocation/publish-revocations", {})
                        agent.log(
                            "Published revocations for {} revocation registr{} {}".format(
                                len(resp["rrid2crid"]),
                                "y" if len(resp["rrid2crid"]) == 1 else "ies",
                                json.dumps([k for k in resp["rrid2crid"]], indent=4),
                            )
                        )
                    except ClientError:
                        pass

        if show_timing:
            timing = await agent.fetch_timing()
            if timing:
                for line in agent.format_timing(timing):
                    log_msg(line)

    finally:
        terminated = True
        try:
            if agent:
                await agent.terminate()
        except Exception:
            LOGGER.exception("Error terminating agent:")
            terminated = False

    await asyncio.sleep(0.1)

    if not terminated:
        os._exit(1)


if __name__ == "__main__":

    parser = argparse.ArgumentParser(description="Runs an "+agentNameDef+" demo agent.")
    parser.add_argument("--no-auto", action="store_true", help="Disable auto issuance")
    parser.add_argument(
        "-p",
        "--port",
        type=int,
        default=8020,
        metavar=("<port>"),
        help="Choose the starting port number to listen on",
    )
    parser.add_argument(
        "--did-exchange",
        action="store_true",
        help="Use DID-Exchange protocol for connections",
    )
    parser.add_argument(
        "--revocation", action="store_true", help="Enable credential revocation"
    )
    parser.add_argument(
        "--tails-server-base-url",
        type=str,
        metavar=("<tails-server-base-url>"),
        help="Tals server base url",
    )
    parser.add_argument(
        "--timing", action="store_true", help="Enable timing information"
    )
    parser.add_argument(
        "--multitenant", action="store_true", help="Enable multitenancy options"
    )
    parser.add_argument(
        "--wallet-type",
        type=str,
        metavar="<wallet-type>",
        help="Set the agent wallet type",
    )
    parser.add_argument(
        "--internal-host",
        type=str,
        default='127.0.0.1',
        metavar="<internal-host>",
        help="Set the internal host name",
    )
    parser.add_argument(
        "--external-host",
        type=str,
        default='localhost',
        metavar="<external-host>",
        help="Set the external host name",
    )
    parser.add_argument(
        "--wallet-name",
        type=str,
        default='',
        metavar="<wallet-name>",
        help="Set the agent wallet name",
    )
    parser.add_argument(
        "--wallet-key",
        type=str,
        default='',
        metavar="<wallet-key>",
        help="Set the agent wallet key",
    )
    parser.add_argument(
        "--wallet-seed",
        type=str,
        default='',
        metavar="<wallet-seed>",
        help="Set the agent wallet seed",
    )
    args = parser.parse_args()

    ENABLE_PYDEVD_PYCHARM = os.getenv("ENABLE_PYDEVD_PYCHARM", "").lower()
    ENABLE_PYDEVD_PYCHARM = ENABLE_PYDEVD_PYCHARM and ENABLE_PYDEVD_PYCHARM not in (
        "false",
        "0",
    )
    PYDEVD_PYCHARM_HOST = os.getenv("PYDEVD_PYCHARM_HOST", "localhost")
    PYDEVD_PYCHARM_CONTROLLER_PORT = int(
        os.getenv("PYDEVD_PYCHARM_CONTROLLER_PORT", 5001)
    )

    if ENABLE_PYDEVD_PYCHARM:
        try:
            import pydevd_pycharm

            print(
                "Faber remote debugging to "
                f"{PYDEVD_PYCHARM_HOST}:{PYDEVD_PYCHARM_CONTROLLER_PORT}"
            )
            pydevd_pycharm.settrace(
                host=PYDEVD_PYCHARM_HOST,
                port=PYDEVD_PYCHARM_CONTROLLER_PORT,
                stdoutToServer=True,
                stderrToServer=True,
                suspend=False,
            )
        except ImportError:
            print("pydevd_pycharm library was not found")

    require_indy()

    tails_server_base_url = args.tails_server_base_url or os.getenv("PUBLIC_TAILS_URL")

    if args.revocation and not tails_server_base_url:
        raise Exception(
            "If revocation is enabled, --tails-server-base-url must be provided"
        )

    try:
        asyncio.get_event_loop().run_until_complete(
            main(
                args.port,
                args.no_auto,
                args.revocation,
                tails_server_base_url,
                args.timing,
                args.multitenant,
                args.did_exchange,
                args.wallet_type,
                args,
            )
        )
    except KeyboardInterrupt:
        os._exit(1)
